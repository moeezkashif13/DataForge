import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MIGRATION_QUEUE } from './background-jobs.types';
import { MigrationExecutionService } from './migration-execution.service';
import type {
  MigrationJobData,
  MigrationJobResult,
} from './background-jobs.types';

@Processor(MIGRATION_QUEUE)
export class BackgroundJobsProcessor extends WorkerHost {
  private readonly logger = new Logger(BackgroundJobsProcessor.name);

  constructor(
    private readonly migrationExecutionService: MigrationExecutionService,
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
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: MigrationJobResult) {
    this.logger.log(
      `[BullMQ Worker Event] Job #${job.id} COMPLETED: ${JSON.stringify(result)}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `[BullMQ Worker Event] Job #${job.id} FAILED with error: ${error.message}`,
    );
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job, progress: any) {
    this.logger.debug(
      `[BullMQ Worker Event] Job #${job.id} Progress: ${JSON.stringify(progress)}`,
    );
  }
}
