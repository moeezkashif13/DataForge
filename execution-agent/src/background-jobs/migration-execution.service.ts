import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { performance } from 'perf_hooks';
import { parse } from 'csv-parse';
import * as readline from 'readline';
import { Client } from 'pg';
import type { Job } from 'bullmq';
import type {
  MigrationJobData,
  MigrationJobResult,
  MigrationFieldMapping,
} from './background-jobs.types';
import { AgentSocketService } from '../agent-socket/agent-socket.service';

@Injectable()
export class MigrationExecutionService {
  private readonly logger = new Logger(MigrationExecutionService.name);

  constructor(
    @Inject(forwardRef(() => AgentSocketService))
    private readonly agentSocketService: AgentSocketService,
  ) {}

  /**
   * Connect to PostgreSQL client database
   */
  private async getDbClient(targetDatabase?: string): Promise<Client> {
    const candidates = [
      process.env.DB_HOST,
      'localhost',
      'host.docker.internal',
      '127.0.0.1',
    ].filter(Boolean) as string[];

    const dbName = targetDatabase || process.env.DB_NAME || 'client_db';
    let lastError: any;

    for (const host of candidates) {
      const client = new Client({
        host,
        port: Number(process.env.DB_PORT) || 3182,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'root',
        database: dbName,
        connectionTimeoutMillis: 3000,
      });

      try {
        await client.connect();
        this.logger.log(
          `[Database] Connected successfully to PostgreSQL on ${host}:3182/${dbName}`,
        );
        return client;
      } catch (err: any) {
        lastError = err;
        try {
          await client.end();
        } catch {}
      }
    }

    throw new Error(
      `Could not connect to PostgreSQL on port 3182 using hosts [${candidates.join(', ')}]. Error: ${lastError?.message}`,
    );
  }

  /**
   * Ensure the target table exists in the target database
   */
  private async ensureCustomersTable(
    client: Client,
    tableName = 'customers',
  ): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id SERIAL PRIMARY KEY,
        csv_index INT,
        customer_id VARCHAR(100),
        first_name VARCHAR(150),
        last_name VARCHAR(150),
        company VARCHAR(200),
        city VARCHAR(150),
        country VARCHAR(150),
        phone_1 VARCHAR(100),
        phone_2 VARCHAR(100),
        email VARCHAR(200),
        subscription_date DATE,
        website VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    await client.query(createTableQuery);
    this.logger.log(
      `[Database] Ensured '${tableName}' table exists with snake_case columns.`,
    );
  }

  /**
   * Insert a batch of customer records in a single transaction
   */
  private async insertCustomerBatch(
    client: Client,
    batch: Record<string, any>[],
    tableName = 'customers',
  ): Promise<number> {
    if (batch.length === 0) return 0;

    const columns = [
      'csv_index',
      'customer_id',
      'first_name',
      'last_name',
      'company',
      'city',
      'country',
      'phone_1',
      'phone_2',
      'email',
      'subscription_date',
      'website',
    ];

    const values: any[] = [];
    const valuePlaceholders: string[] = [];

    batch.forEach((row, rowIndex) => {
      const rowPlaceholders: string[] = [];
      columns.forEach((col, colIndex) => {
        const paramIndex = rowIndex * columns.length + colIndex + 1;
        rowPlaceholders.push(`$${paramIndex}`);
        let val = row[col];
        if (col === 'csv_index') {
          val = val ? parseInt(val, 10) : null;
        } else if (col === 'subscription_date') {
          val = val && String(val).trim() ? String(val).trim() : null;
        }
        values.push(val ?? null);
      });
      valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
    });

    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES ${valuePlaceholders.join(', ')};
    `;

    await client.query('BEGIN');
    try {
      await client.query(query, values);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    return batch.length;
  }

  /**
   * Resolve file path for the source data file
   */
  private resolveSourceFilePath(
    sourcePath?: string | null,
    defaultFilename = 'customers.csv',
  ): string {
    const candidatePaths = [
      sourcePath ? path.resolve(process.cwd(), sourcePath) : null,
      sourcePath ? path.resolve(process.cwd(), 'src', sourcePath) : null,
      defaultFilename ? path.resolve(__dirname, defaultFilename) : null,
      defaultFilename ? path.resolve(__dirname, '..', defaultFilename) : null,
      defaultFilename
        ? path.resolve(process.cwd(), 'src', defaultFilename)
        : null,
      defaultFilename
        ? path.resolve(process.cwd(), 'execution-agent', 'src', defaultFilename)
        : null,
    ].filter(Boolean) as string[];

    for (const candidate of candidatePaths) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    throw new NotFoundException(
      `Source file not found in any expected location: ${candidatePaths.join(', ')}`,
    );
  }

  /**
   * Flag determining whether to use user-provided dynamic mappings or static mappings.
   * Set to false for now to use static direct mappings for known JSON schema.
   */
  private readonly useDynamicMappings: boolean = false;

  /**
   * Static mappings for JSON fields directly to PostgreSQL customer table columns.
   */
  private readonly staticJsonMappings: Record<string, string> = {
    index: 'csv_index',
    customer_id: 'customer_id',
    first_name: 'first_name',
    last_name: 'last_name',
    company: 'company',
    city: 'city',
    country: 'country',
    phone_1: 'phone_1',
    phone_2: 'phone_2',
    email: 'email',
    subscription_date: 'subscription_date',
    website: 'website',
  };

  /**
   * Normalize JSON record fields into target database column format.
   * - If useDynamicMappings is false: Uses static direct mappings for known JSON data structure.
   * - If useDynamicMappings is true: Dynamically transforms keys and applies user-provided mappings.
   */
  private normalizeRecord(
    rawRecord: Record<string, any>,
    userMappings?: MigrationFieldMapping[],
    useDynamic: boolean = this.useDynamicMappings,
  ): Record<string, any> {
    if (!useDynamic) {
      // 1. Static mappings directly for known JSON contents
      const staticRecord: Record<string, any> = {};

      for (const [sourceKey, targetCol] of Object.entries(
        this.staticJsonMappings,
      )) {
        staticRecord[targetCol] = rawRecord[sourceKey] ?? null;
      }

      // Also support common camelCase / alias variants in JSON files
      if (
        !staticRecord.csv_index &&
        (rawRecord.csv_index || rawRecord.index !== undefined)
      ) {
        staticRecord.csv_index = rawRecord.csv_index ?? rawRecord.index;
      }
      if (!staticRecord.customer_id && (rawRecord.customerId || rawRecord.id)) {
        staticRecord.customer_id = rawRecord.customerId ?? rawRecord.id;
      }
      if (!staticRecord.first_name && rawRecord.firstName) {
        staticRecord.first_name = rawRecord.firstName;
      }
      if (!staticRecord.last_name && rawRecord.lastName) {
        staticRecord.last_name = rawRecord.lastName;
      }
      if (!staticRecord.phone_1 && rawRecord.phone1) {
        staticRecord.phone_1 = rawRecord.phone1;
      }
      if (!staticRecord.phone_2 && rawRecord.phone2) {
        staticRecord.phone_2 = rawRecord.phone2;
      }
      if (!staticRecord.subscription_date && rawRecord.subscriptionDate) {
        staticRecord.subscription_date = rawRecord.subscriptionDate;
      }

      return staticRecord;
    }

    // 2. Dynamic mappings implementation (preserved for future use)
    const record: Record<string, any> = {};

    // Convert raw keys to snake_case column names
    for (const [key, value] of Object.entries(rawRecord)) {
      let normalizedKey = key
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase()
        .trim();

      if (normalizedKey === 'index') {
        normalizedKey = 'csv_index';
      } else if (
        normalizedKey === 'id' &&
        !rawRecord['customer_id'] &&
        !rawRecord['customerId']
      ) {
        normalizedKey = 'customer_id';
      } else if (normalizedKey === 'phone1') {
        normalizedKey = 'phone_1';
      } else if (normalizedKey === 'phone2') {
        normalizedKey = 'phone_2';
      }

      record[normalizedKey] = value;
    }

    // Explicit user-provided mappings override
    if (
      userMappings &&
      Array.isArray(userMappings) &&
      userMappings.length > 0
    ) {
      for (const m of userMappings) {
        if (m.sourceField && m.targetField) {
          const val =
            rawRecord[m.sourceField] ??
            record[m.sourceField.toLowerCase()] ??
            rawRecord[m.sourceField.toLowerCase()];
          if (val !== undefined) {
            record[m.targetField] = val;
          }
        }
      }
    }

    return record;
  }

  /**
   * Asynchronously stream records from either a JSON array file or an NDJSON file
   */
  private async *streamJsonRecords(
    filePath: string,
  ): AsyncGenerator<Record<string, any>> {
    const fd = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(2048);
    const { bytesRead } = await fd.read(buffer, 0, 2048, 0);
    await fd.close();

    const sample = buffer.toString('utf8', 0, bytesRead).trim();
    const isJsonArray = sample.startsWith('[');

    if (isJsonArray) {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === 'object') {
            yield item;
          }
        }
      } else if (parsed && typeof parsed === 'object') {
        yield parsed;
      }
    } else {
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const item = JSON.parse(trimmed);
          if (item && typeof item === 'object') {
            yield item;
          }
        } catch {}
      }
    }
  }

  /**
   * Mask sensitive record attributes for preview logging
   */
  private maskRecord(record: Record<string, any>): Record<string, any> {
    const masked: Record<string, any> = {};
    for (const [key, val] of Object.entries(record)) {
      if (typeof val !== 'string' || val.length === 0) {
        masked[key] = val;
        continue;
      }
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('email')) {
        const parts = val.split('@');
        masked[key] =
          parts.length === 2
            ? `${parts[0].slice(0, 2)}***@${parts[1]}`
            : '***@***';
      } else if (lowerKey.includes('phone')) {
        masked[key] = val.length > 4 ? `***-***-${val.slice(-4)}` : '***';
      } else if (
        lowerKey.includes('first name') ||
        lowerKey.includes('last name') ||
        lowerKey === 'name'
      ) {
        masked[key] = `${val[0]}***`;
      } else if (lowerKey.includes('customer id') || lowerKey === 'id') {
        masked[key] = val.length > 4 ? `${val.slice(0, 4)}****` : val;
      } else {
        masked[key] = val;
      }
    }
    return masked;
  }

  /**
   * Backward-compatible alias for executeCSVToPostgreSQLMigration
   */
  async executeMigration(
    job: Job<MigrationJobData, MigrationJobResult>,
  ): Promise<MigrationJobResult> {
    return this.executeCSVToPostgreSQLMigration(job);
  }

  /**
   * Main CSV to PostgreSQL migration stream execution handler
   */
  async executeCSVToPostgreSQLMigration(
    job: Job<MigrationJobData, MigrationJobResult>,
  ): Promise<MigrationJobResult> {
    const { id, data } = job;
    const migration = data.migration;

    const migrationId = migration?.id || 'unknown';
    const migrationName = migration?.name || `Migration #${id}`;
    const targetTable = migration?.target_table || 'customers';
    const targetDatabase = migration?.target_database || 'client_db';
    const sourceFilePath = this.resolveSourceFilePath(
      migration?.source_file_path,
      'customers.csv',
    );

    const stats = fs.statSync(sourceFilePath);
    const fileSizeMb = (stats.size / (1024 * 1024)).toFixed(2);

    const batchSize = data.metadata?.batchSize || 1000;
    const limit = data.metadata?.limit;
    const isEcoMode = data.metadata?.ecoMode ?? true;

    this.logger.log(
      `[Migration Pipeline Started] Job #${id} ("${migrationName}") | Source: "${sourceFilePath}" (${fileSizeMb} MB) | Target: ${targetDatabase}.${targetTable} | Batch Size: ${batchSize}`,
    );

    // Notify backend that migration execution has started (changes status from Ready to Running)
    if (migrationId && migrationId !== 'unknown') {
      this.agentSocketService.sendMessageToBackend('agent:migration:started', {
        migrationId,
        agentId: data.agentId,
        projectId: data.projectId,
        organizationId: data.organizationId,
        status: 'Running',
        timestamp: new Date().toISOString(),
      });
      this.logger.log(
        `[Migration Started] Sent agent:migration:started to backend for migration "${migrationName}" (${migrationId})`,
      );
    }

    await job.updateProgress({
      percentage: 5,
      rowsProcessed: 0,
      stage: 'INITIALIZING',
      message: `Connecting to ${targetDatabase} and verifying table "${targetTable}"...`,
    });

    let originalPriority: number | null = null;
    try {
      originalPriority = os.getPriority();
      os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL);
    } catch {}

    let dbClient: Client | null = null;

    try {
      dbClient = await this.getDbClient(targetDatabase);
      await this.ensureCustomersTable(dbClient, targetTable);

      const sourceStream = fs.createReadStream(sourceFilePath, {
        highWaterMark: 64 * 1024,
      });

      const csvParser = parse({
        columns: (header) =>
          header.map((col: string) => {
            if (col.toLowerCase() === 'index') return 'csv_index';
            return col.trim().toLowerCase().replace(/\s+/g, '_');
          }),
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true,
        bom: true,
      });

      const startTime = performance.now();
      let recordCount = 0;
      let batchCount = 0;
      let totalInserted = 0;
      const batch: Record<string, any>[] = [];

      const parsedStream = sourceStream.pipe(csvParser);

      for await (const record of parsedStream) {
        recordCount++;
        batch.push(record);

        if (recordCount % 500 === 0) {
          if (isEcoMode) {
            await new Promise((resolve) => setTimeout(resolve, 8));
          } else {
            await new Promise((resolve) => setImmediate(resolve));
          }
        }

        if (recordCount <= 2) {
          this.logger.log(
            `[Migration Preview #${recordCount}] ${JSON.stringify(this.maskRecord(record))}`,
          );
        }

        if (batch.length >= batchSize) {
          batchCount++;
          const batchToInsert = [...batch];
          batch.length = 0;

          const insertedCount = await this.insertCustomerBatch(
            dbClient,
            batchToInsert,
            targetTable,
          );
          totalInserted += insertedCount;

          const now = performance.now();
          const elapsedSec = ((now - startTime) / 1000).toFixed(2);
          const currentRate = Math.round(
            totalInserted / ((now - startTime) / 1000 || 1),
          );

          this.logger.log(
            `[Job #${id}] Inserted Batch #${batchCount} (${insertedCount} rows) into ${targetTable} | Total: ${totalInserted} | Elapsed: ${elapsedSec}s | Rate: ~${currentRate} rows/s`,
          );

          await job.updateProgress({
            percentage: limit
              ? Math.min(99, Math.round((totalInserted / limit) * 100))
              : 50,
            rowsProcessed: totalInserted,
            stage: 'MIGRATING',
            message: `Batch #${batchCount}: Inserted ${insertedCount} rows (Total: ${totalInserted.toLocaleString()})`,
          });
        }

        if (limit && recordCount >= limit) {
          this.logger.log(
            `[Job #${id}] Reached row limit of ${limit}. Stopping stream.`,
          );
          break;
        }
      }

      // Insert any remaining records
      if (batch.length > 0) {
        batchCount++;
        const remainderCount = await this.insertCustomerBatch(
          dbClient,
          batch,
          targetTable,
        );
        totalInserted += remainderCount;
        batch.length = 0;

        this.logger.log(
          `[Job #${id}] Inserted final remainder batch #${batchCount} (${remainderCount} rows).`,
        );
      }

      const totalDurationSec = ((performance.now() - startTime) / 1000).toFixed(
        2,
      );

      await job.updateProgress({
        percentage: 100,
        rowsProcessed: totalInserted,
        stage: 'COMPLETED',
        message: `Migration completed: ${totalInserted.toLocaleString()} rows migrated into ${targetTable}.`,
      });

      this.logger.log(
        `[Migration Completed] Job #${id} finished: ${totalInserted.toLocaleString()} rows inserted in ${totalDurationSec}s`,
      );

      // Notify backend that migration execution has completed (changes status to Completed)
      if (migrationId && migrationId !== 'unknown') {
        this.agentSocketService.sendMessageToBackend(
          'agent:migration:completed',
          {
            migrationId,
            agentId: data.agentId,
            projectId: data.projectId,
            organizationId: data.organizationId,
            status: 'Completed',
            rowsInserted: totalInserted,
            totalDurationSec,
            timestamp: new Date().toISOString(),
          },
        );
        this.logger.log(
          `[Migration Completed] Sent agent:migration:completed to backend for migration "${migrationName}" (${migrationId})`,
        );
      }

      return {
        success: true,
        migrationId,
        rowsInserted: totalInserted,
        totalInserted,
        elapsedSeconds: totalDurationSec,
        message: `Successfully migrated ${totalInserted.toLocaleString()} rows into ${targetDatabase}.${targetTable}`,
      };
    } catch (err: any) {
      this.logger.error(
        `[Migration Pipeline Error] Job #${id} failed: ${err.message}`,
        err.stack,
      );

      // Notify backend that migration execution failed
      if (migrationId && migrationId !== 'unknown') {
        this.agentSocketService.sendMessageToBackend('agent:migration:failed', {
          migrationId,
          agentId: data.agentId,
          projectId: data.projectId,
          organizationId: data.organizationId,
          status: 'Failed',
          error: err.message,
          timestamp: new Date().toISOString(),
        });
      }

      throw err;
    } finally {
      if (dbClient) {
        try {
          await dbClient.end();
          this.logger.log(
            '[Database] Disconnected cleanly from target database.',
          );
        } catch {}
      }

      if (originalPriority !== null) {
        try {
          os.setPriority(originalPriority);
        } catch {}
      }
    }
  }

  /**
   * JSON to PostgreSQL migration handler (supports JSON array and NDJSON)
   */
  async executeJSONToPostgreSQLMigration(
    job: Job<MigrationJobData, MigrationJobResult>,
  ): Promise<MigrationJobResult> {
    const { id, data } = job;
    const migration = data.migration;

    const migrationId = migration?.id || 'unknown';
    const migrationName = migration?.name || `Migration #${id}`;
    const targetTable = migration?.target_table || 'customers';
    const targetDatabase = migration?.target_database || 'client_db';
    const sourceFilePath = this.resolveSourceFilePath(
      migration?.source_file_path,
      'customers.json',
    );

    const stats = fs.statSync(sourceFilePath);
    const fileSizeMb = (stats.size / (1024 * 1024)).toFixed(2);

    const batchSize = data.metadata?.batchSize || 1000;
    const limit = data.metadata?.limit;
    const isEcoMode = data.metadata?.ecoMode ?? true;

    this.logger.log(
      `[JSON Migration Pipeline Started] Job #${id} ("${migrationName}") | Source: "${sourceFilePath}" (${fileSizeMb} MB) | Target: ${targetDatabase}.${targetTable} | Batch Size: ${batchSize}`,
    );

    // Notify backend that migration execution has started (changes status from Ready to Running)
    if (migrationId && migrationId !== 'unknown') {
      this.agentSocketService.sendMessageToBackend('agent:migration:started', {
        migrationId,
        agentId: data.agentId,
        projectId: data.projectId,
        organizationId: data.organizationId,
        status: 'Running',
        timestamp: new Date().toISOString(),
      });
      this.logger.log(
        `[Migration Started] Sent agent:migration:started to backend for JSON migration "${migrationName}" (${migrationId})`,
      );
    }

    await job.updateProgress({
      percentage: 5,
      rowsProcessed: 0,
      stage: 'INITIALIZING',
      message: `Connecting to ${targetDatabase} and verifying table "${targetTable}"...`,
    });

    let originalPriority: number | null = null;
    try {
      originalPriority = os.getPriority();
      os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL);
    } catch {}

    let dbClient: Client | null = null;

    try {
      dbClient = await this.getDbClient(targetDatabase);
      await this.ensureCustomersTable(dbClient, targetTable);

      const startTime = performance.now();
      let recordCount = 0;
      let batchCount = 0;
      let totalInserted = 0;
      const batch: Record<string, any>[] = [];

      for await (const rawRecord of this.streamJsonRecords(sourceFilePath)) {
        recordCount++;
        const record = this.normalizeRecord(rawRecord, migration?.mappings);
        batch.push(record);

        if (recordCount % 500 === 0) {
          if (isEcoMode) {
            await new Promise((resolve) => setTimeout(resolve, 8));
          } else {
            await new Promise((resolve) => setImmediate(resolve));
          }
        }

        if (recordCount <= 2) {
          this.logger.log(
            `[JSON Migration Preview #${recordCount}] ${JSON.stringify(this.maskRecord(record))}`,
          );
        }

        if (batch.length >= batchSize) {
          batchCount++;
          const batchToInsert = [...batch];
          batch.length = 0;

          const insertedCount = await this.insertCustomerBatch(
            dbClient,
            batchToInsert,
            targetTable,
          );
          totalInserted += insertedCount;

          const now = performance.now();
          const elapsedSec = ((now - startTime) / 1000).toFixed(2);
          const currentRate = Math.round(
            totalInserted / ((now - startTime) / 1000 || 1),
          );

          this.logger.log(
            `[Job #${id}] Inserted JSON Batch #${batchCount} (${insertedCount} rows) into ${targetTable} | Total: ${totalInserted} | Elapsed: ${elapsedSec}s | Rate: ~${currentRate} rows/s`,
          );

          await job.updateProgress({
            percentage: limit
              ? Math.min(99, Math.round((totalInserted / limit) * 100))
              : 50,
            rowsProcessed: totalInserted,
            stage: 'MIGRATING',
            message: `Batch #${batchCount}: Inserted ${insertedCount} rows (Total: ${totalInserted.toLocaleString()})`,
          });
        }

        if (limit && recordCount >= limit) {
          this.logger.log(
            `[Job #${id}] Reached row limit of ${limit}. Stopping JSON stream.`,
          );
          break;
        }
      }

      // Insert any remaining records
      if (batch.length > 0) {
        batchCount++;
        const remainderCount = await this.insertCustomerBatch(
          dbClient,
          batch,
          targetTable,
        );
        totalInserted += remainderCount;
        batch.length = 0;

        this.logger.log(
          `[Job #${id}] Inserted final remainder JSON batch #${batchCount} (${remainderCount} rows).`,
        );
      }

      const totalDurationSec = ((performance.now() - startTime) / 1000).toFixed(
        2,
      );

      await job.updateProgress({
        percentage: 100,
        rowsProcessed: totalInserted,
        stage: 'COMPLETED',
        message: `Migration completed: ${totalInserted.toLocaleString()} rows migrated from JSON into ${targetTable}.`,
      });

      this.logger.log(
        `[Migration Completed] Job #${id} finished: ${totalInserted.toLocaleString()} rows inserted in ${totalDurationSec}s`,
      );

      // Notify backend that migration execution has completed (changes status to Completed)
      if (migrationId && migrationId !== 'unknown') {
        this.agentSocketService.sendMessageToBackend(
          'agent:migration:completed',
          {
            migrationId,
            agentId: data.agentId,
            projectId: data.projectId,
            organizationId: data.organizationId,
            status: 'Completed',
            rowsInserted: totalInserted,
            totalDurationSec,
            timestamp: new Date().toISOString(),
          },
        );
        this.logger.log(
          `[Migration Completed] Sent agent:migration:completed to backend for JSON migration "${migrationName}" (${migrationId})`,
        );
      }

      return {
        success: true,
        migrationId,
        rowsInserted: totalInserted,
        totalInserted,
        elapsedSeconds: totalDurationSec,
        message: `Successfully migrated ${totalInserted.toLocaleString()} rows from JSON into ${targetDatabase}.${targetTable}`,
      };
    } catch (err: any) {
      this.logger.error(
        `[JSON Migration Pipeline Error] Job #${id} failed: ${err.message}`,
        err.stack,
      );

      // Notify backend that migration execution failed
      if (migrationId && migrationId !== 'unknown') {
        this.agentSocketService.sendMessageToBackend('agent:migration:failed', {
          migrationId,
          agentId: data.agentId,
          projectId: data.projectId,
          organizationId: data.organizationId,
          status: 'Failed',
          error: err.message,
          timestamp: new Date().toISOString(),
        });
      }

      throw err;
    } finally {
      if (dbClient) {
        try {
          await dbClient.end();
          this.logger.log(
            '[Database] Disconnected cleanly from target database.',
          );
        } catch {}
      }

      if (originalPriority !== null) {
        try {
          os.setPriority(originalPriority);
        } catch {}
      }
    }
  }
}
