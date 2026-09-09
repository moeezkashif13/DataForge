import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { performance } from 'perf_hooks';
import { parse } from 'csv-parse';
import ndjson from 'ndjson';
import { Client } from 'pg';

export interface StreamCustomersOptions {
  limit?: number;
  batchLogSize?: number;
  ecoMode?: boolean;
  gzip?: boolean;
  firstBatchOnly?: boolean;
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  getHello(): string {
    return 'Hello World!';
  }

  private async getDbClient(): Promise<Client> {
    const candidates = [
      process.env.DB_HOST,
      'localhost',
      'host.docker.internal',
      '127.0.0.1',
    ].filter(Boolean) as string[];

    let lastError: any;
    for (const host of candidates) {
      const client = new Client({
        host,
        port: Number(process.env.DB_PORT) || 3182,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'client_db',
        connectionTimeoutMillis: 3000,
      });

      try {
        await client.connect();
        this.logger.log(
          `[Database] Connected successfully to PostgreSQL on ${host}:3182/${process.env.DB_NAME || 'client_db'}`,
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

  private async ensureCustomersTable(client: Client): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS customers (
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
      `[Database] Ensured 'customers' table exists with snake_case columns.`,
    );
  }

  private async insertCustomerBatch(
    client: Client,
    batch: Record<string, any>[],
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
      INSERT INTO customers (${columns.join(', ')})
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

  private resolveCustomersCsvPath(): string {
    const candidatePaths = [
      path.resolve(__dirname, 'customers.csv'),
      path.resolve(process.cwd(), 'src', 'customers.csv'),
      path.resolve(process.cwd(), 'execution-agent', 'src', 'customers.csv'),
      path.resolve(__dirname, '..', 'src', 'customers.csv'),
    ];

    for (const candidate of candidatePaths) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    throw new NotFoundException(
      `customers.csv not found in any expected location: ${candidatePaths.join(', ')}`,
    );
  }

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

  async streamCustomers(
    req: Request,
    res: Response,
    options: StreamCustomersOptions = {},
  ): Promise<void> {
    const filePath = this.resolveCustomersCsvPath();
    const stats = fs.statSync(filePath);
    const fileSizeMb = (stats.size / (1024 * 1024)).toFixed(2);

    const batchLogSize =
      options.batchLogSize && options.batchLogSize > 0
        ? options.batchLogSize
        : 5000;
    const limit =
      options.limit && options.limit > 0 ? options.limit : undefined;
    const isEcoMode = Boolean(options.ecoMode);

    // Check gzip request/option
    const acceptEncoding = (req.headers['accept-encoding'] as string) || '';
    const useGzip = Boolean(options.gzip || acceptEncoding.includes('gzip'));

    this.logger.log(
      `[CSV Stream Pipeline Started] Path: "${filePath}" | Size: ${fileSizeMb} MB | EcoMode: ${isEcoMode} | Gzip: ${useGzip} | Batch log interval: ${batchLogSize.toLocaleString()} rows | Limit: ${limit ? limit.toLocaleString() : 'None'}`,
    );

    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (useGzip) {
      res.setHeader('Content-Encoding', 'gzip');
    }

    let originalPriority: number | null = null;
    try {
      originalPriority = os.getPriority();
      os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL);
    } catch {}

    const abortController = new AbortController();
    const reqSignal = (req as any).signal as AbortSignal | undefined;

    if (reqSignal) {
      reqSignal.addEventListener(
        'abort',
        () => abortController.abort(reqSignal.reason),
        { once: true },
      );
    }

    const onClientClose = () => {
      if (!res.writableEnded && !abortController.signal.aborted) {
        this.logger.warn(
          `[CSV Stream Client Disconnected] Socket closed prematurely by client. Aborting pipeline.`,
        );
        abortController.abort(new Error('Client closed connection'));
      }
    };
    res.on('close', onClientClose);

    const sourceStream = fs.createReadStream(filePath, {
      highWaterMark: 64 * 1024,
    });

    const csvParser = parse({
      columns: (header) =>
        header.map((col) => {
          if (col.toLowerCase() === 'index') return 'csv_index';
          return col.trim().toLowerCase().replace(/\s+/g, '_');
        }),

      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
      bom: true,
    });

    let dbClient: Client | null = null;
    try {
      dbClient = await this.getDbClient();
      await this.ensureCustomersTable(dbClient);
    } catch (dbErr: any) {
      this.logger.error(
        `[Database Error] Could not connect to PostgreSQL: ${dbErr.message}`,
        dbErr.stack,
      );
      if (!res.headersSent) {
        res.status(500).json({
          statusCode: 500,
          error: 'Database Connection Failed',
          message: dbErr.message,
        });
      }
      return;
    }

    const logger = this.logger;
    const maskRecord = this.maskRecord.bind(this);
    const insertCustomerBatch = this.insertCustomerBatch.bind(this);
    const batchSize =
      options.batchLogSize && options.batchLogSize > 0
        ? options.batchLogSize
        : 1000;
    const firstBatchOnly = options.firstBatchOnly !== false; // defaults to true for testing

    let recordCount = 0;
    let batchCount = 0;
    let totalInserted = 0;
    const startTime = performance.now();
    const batch: Record<string, any>[] = [];

    async function* processAndLog(source: AsyncIterable<Record<string, any>>) {
      for await (const record of source) {
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
          logger.log(
            `[CSV Stream Preview #${recordCount}] ${JSON.stringify(maskRecord(record))}`,
          );
        }

        if (batch.length >= batchSize) {
          batchCount++;
          const batchToInsert = [...batch];
          batch.length = 0;

          const insertedCount = await insertCustomerBatch(
            dbClient!,
            batchToInsert,
          );
          totalInserted += insertedCount;

          const now = performance.now();
          const elapsedSec = ((now - startTime) / 1000).toFixed(2);
          const currentRate = Math.round(
            totalInserted / ((now - startTime) / 1000 || 1),
          );
          const mem = process.memoryUsage();
          const heapMb = (mem.heapUsed / (1024 * 1024)).toFixed(1);

          logger.log(
            `[CSV Stream DB Insert] Successfully inserted Batch #${batchCount} (${insertedCount.toLocaleString()} rows) into 'customers' table in client_db | Total: ${totalInserted.toLocaleString()} rows | Elapsed: ${elapsedSec}s | Rate: ~${currentRate.toLocaleString()} rows/s | Heap: ${heapMb} MB`,
          );

          yield {
            status: 'batch_inserted',
            batch: batchCount,
            rowsInserted: insertedCount,
            totalInserted,
            tableName: 'customers',
            database: 'client_db',
            elapsedSeconds: elapsedSec,
            message: firstBatchOnly
              ? `First batch of ${insertedCount} rows inserted into 'customers'. Stopping stream as requested for testing.`
              : `Batch #${batchCount} of ${insertedCount} rows inserted into 'customers'.`,
          };
        }

        if (limit && recordCount >= limit) {
          logger.log(
            `[CSV Stream Limit] Reached limit of ${limit.toLocaleString()} rows. Ending stream.`,
          );
          break;
        }
      }

      if (!firstBatchOnly && batch.length > 0) {
        batchCount++;
        const remainderCount = await insertCustomerBatch(dbClient!, batch);
        totalInserted += remainderCount;
        batch.length = 0;

        logger.log(
          `[CSV Stream DB Insert] Inserted final remainder batch #${batchCount} (${remainderCount} rows).`,
        );

        yield {
          status: 'batch_inserted',
          batch: batchCount,
          rowsInserted: remainderCount,
          totalInserted,
          tableName: 'customers',
          database: 'client_db',
          message: `Final batch of ${remainderCount} rows inserted into 'customers'.`,
        };
      }

      const totalDurationSec = ((performance.now() - startTime) / 1000).toFixed(
        2,
      );
      const avgRate = Math.round(
        totalInserted / ((performance.now() - startTime) / 1000 || 1),
      );
      const finalMem = (process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(
        1,
      );

      logger.log(
        `[CSV Stream Completed] Total inserted: ${totalInserted.toLocaleString()} rows in ${totalDurationSec}s | Avg DB insert rate: ~${avgRate.toLocaleString()} rows/s | Final Heap: ${finalMem} MB`,
      );
    }

    try {
      const stages: any[] = [
        sourceStream,
        csvParser,
        processAndLog,
        ndjson.stringify(),
      ];

      if (useGzip) {
        stages.push(createGzip({ level: 6 }));
      }

      stages.push(res);

      await pipeline(stages, { signal: abortController.signal });
    } catch (error: any) {
      if (
        error?.code === 'ABORT_ERR' ||
        error?.name === 'AbortError' ||
        abortController.signal.aborted
      ) {
        return;
      }

      logger.error(
        `[CSV Stream Pipeline Error] ${error?.message || error}`,
        error?.stack,
      );

      if (!res.headersSent) {
        res.status(500).json({
          statusCode: 500,
          message: 'Error streaming CSV dataset',
          error: error?.message,
        });
      }
    } finally {
      res.off('close', onClientClose);

      if (dbClient) {
        try {
          await dbClient.end();
          logger.log('[Database] Disconnected cleanly from client_db.');
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
