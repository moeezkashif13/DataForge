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
   * Main job execution handler for BullMQ worker
   */
  async process(
    job: Job<MigrationJobData, MigrationJobResult, string>,
  ): Promise<MigrationJobResult> {
    return this.migrationExecutionService.executeMigration(job);
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
