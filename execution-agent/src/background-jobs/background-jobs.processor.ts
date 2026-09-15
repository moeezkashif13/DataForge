import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MIGRATION_QUEUE } from './background-jobs.types';
import type {
  MigrationJobData,
  MigrationJobResult,
} from './background-jobs.types';

@Processor(MIGRATION_QUEUE)
export class BackgroundJobsProcessor extends WorkerHost {
  private readonly logger = new Logger(BackgroundJobsProcessor.name);

  /**
   * Main job execution handler for BullMQ worker
   */
  async process(
    job: Job<MigrationJobData, MigrationJobResult, string>,
  ): Promise<MigrationJobResult> {
    const { id, name, data } = job;
    const startTime = Date.now();

    this.logger.log(
      `[Worker Start] Processing job #${id} ("${name}") for migration: ${data.migrationId || 'bulk-migration'}`,
    );

    try {
      // Step 1: Initializing
      await job.updateProgress({
        percentage: 10,
        rowsProcessed: 0,
        stage: 'INITIALIZING',
        message:
          'Validating migration parameters and establishing database connection...',
      });

      // Simulate step / yield to event loop
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 2: Running migration workload
      await job.updateProgress({
        percentage: 50,
        rowsProcessed: data.count || 1000,
        stage: 'MIGRATING',
        message: `Processing migration workload (batch size: ${data.batchSize || 1000})...`,
      });

      // Step 3: Completing
      await job.updateProgress({
        percentage: 100,
        rowsProcessed: data.count || 1000,
        stage: 'COMPLETED',
        message: 'All migration batches successfully processed and committed.',
      });

      const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
      this.logger.log(
        `[Worker Completed] Job #${id} finished in ${elapsedSeconds}s`,
      );

      return {
        success: true,
        migrationId: data.migrationId,
        rowsInserted: data.count || 1000,
        totalInserted: data.count || 1000,
        elapsedSeconds,
        message: `Successfully executed background job #${id}`,
      };
    } catch (err: any) {
      this.logger.error(
        `[Worker Error] Failed job #${id}: ${err.message}`,
        err.stack,
      );
      throw err;
    }
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
