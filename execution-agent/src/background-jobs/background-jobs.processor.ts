import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MIGRATION_QUEUE } from './background-jobs.types';
import { MigrationExecutionService } from './migration-execution.service';
import { MetricsService } from '../metrics/metrics.service';
import type {
  MigrationJobData,
  MigrationJobResult,
} from './background-jobs.types';

@Processor(MIGRATION_QUEUE)
export class BackgroundJobsProcessor extends WorkerHost {
  private readonly logger = new Logger(BackgroundJobsProcessor.name);

  constructor(
    private readonly migrationExecutionService: MigrationExecutionService,
    private readonly metricsService: MetricsService,
  ) {
    super();
  }

  /**
   * Main job execution handler for BullMQ worker.
   * Dynamically routes to the appropriate execution strategy based on source_type and target_type.
   */
  async process(
    job: Job<MigrationJobData, MigrationJobResult, string>,
  ): Promise<MigrationJobResult> {
    const migration = job.data?.migration;
    const sourceType = (migration?.source_type || '').toLowerCase().trim();
    const targetType = (migration?.target_type || '').toLowerCase().trim();

    this.logger.log(
      `[BullMQ Processor] Routing Job #${job.id} ("${migration?.name || migration?.id}") | Route: ${sourceType} -> ${targetType}`,
    );

    const isPostgres = targetType === 'postgresql' || targetType === 'postgres';
    const isCsv = sourceType === 'csv';
    const isJson = sourceType === 'json';

    if (isCsv && isPostgres) {
      return this.migrationExecutionService.executeCSVToPostgreSQLMigration(job);
    }

    if (isJson && isPostgres) {
      return this.migrationExecutionService.executeJSONToPostgreSQLMigration(job);
    }

    const unsupportedMessage = `Unsupported migration route: "${migration?.source_type}" -> "${migration?.target_type}". Currently supported routes: CSV -> PostgreSQL and JSON -> PostgreSQL.`;
    this.logger.error(`[BullMQ Processor] ${unsupportedMessage}`);
    throw new Error(unsupportedMessage);
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(`[BullMQ Worker Event] Job #${job.id} is now ACTIVE`);
    this.metricsService.recordJobActive(MIGRATION_QUEUE, 'migration', job.timestamp);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: MigrationJobResult) {
    this.logger.log(
      `[BullMQ Worker Event] Job #${job.id} COMPLETED: ${JSON.stringify(result)}`,
    );
    const durationMs = Date.now() - (job.processedOn || job.timestamp || Date.now());
    this.metricsService.recordJobCompleted(MIGRATION_QUEUE, 'migration', durationMs);
    if (result?.rowsInserted) {
      const elapsed = parseFloat(result.elapsedSeconds || '1') || 1;
      const throughput = Math.round(result.rowsInserted / elapsed);
      this.metricsService.recordMigrationRows(result.rowsInserted, throughput);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `[BullMQ Worker Event] Job #${job.id} FAILED with error: ${error.message}`,
    );
    this.metricsService.recordJobFailed(
      MIGRATION_QUEUE,
      'migration',
      error.name || 'MigrationError',
    );
    if (job.attemptsMade > 0) {
      this.metricsService.recordJobRetried(MIGRATION_QUEUE);
    }
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(`[BullMQ Worker Event] Migration Job #${jobId} STALLED`);
    this.metricsService.recordJobStalled(MIGRATION_QUEUE);
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job, progress: any) {
    this.logger.debug(
      `[BullMQ Worker Event] Job #${job.id} Progress: ${JSON.stringify(progress)}`,
    );
    if (progress?.rowsProcessed) {
      this.metricsService.recordMigrationRows(0, progress.throughput_rows_per_second);
    }
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.error(`[BullMQ Worker Event] Worker error: ${error.message}`, error.stack);
    this.metricsService.recordWorkerError(MIGRATION_QUEUE);
  }
}
