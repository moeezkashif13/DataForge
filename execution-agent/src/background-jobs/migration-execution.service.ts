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
import { Client } from 'pg';
import type { Job } from 'bullmq';
import type {
  MigrationJobData,
  MigrationJobResult,
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
   * Resolve file path for the source CSV file
   */
  private resolveSourceFilePath(sourcePath?: string | null): string {
    const candidatePaths = [
      sourcePath ? path.resolve(process.cwd(), sourcePath) : null,
      sourcePath ? path.resolve(process.cwd(), 'src', sourcePath) : null,
      path.resolve(__dirname, 'customers.csv'),
      path.resolve(__dirname, '..', 'customers.csv'),
      path.resolve(process.cwd(), 'src', 'customers.csv'),
      path.resolve(process.cwd(), 'execution-agent', 'src', 'customers.csv'),
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
   * Main migration stream execution handler, called by BullMQ processor
   */
  async executeMigration(
    job: Job<MigrationJobData, MigrationJobResult>,
  ): Promise<MigrationJobResult> {
    const { id, data } = job;
    const migration = data.migration;

    const migrationId = migration?.id || 'unknown';
    console.log(migrationId, 'lllllllllllll');
    const migrationName = migration?.name || `Migration #${id}`;
    const targetTable = migration?.target_table || 'customers';
    const targetDatabase = migration?.target_database || 'client_db';
    const sourceFilePath = this.resolveSourceFilePath(
      migration?.source_file_path,
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
