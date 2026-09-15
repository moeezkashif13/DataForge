import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions, Job } from 'bullmq';
import {
  MIGRATION_QUEUE,
  MigrationJobData,
  MigrationJobResult,
} from './background-jobs.types';

@Injectable()
export class BackgroundJobsService {
  private readonly logger = new Logger(BackgroundJobsService.name);

  constructor(
    @InjectQueue(MIGRATION_QUEUE)
    private readonly migrationQueue: Queue,
  ) {}

  /**
   * Enqueue a new migration background job into BullMQ
   */
  async addMigrationJob(
    data: MigrationJobData,
    options?: JobsOptions,
  ): Promise<Job<MigrationJobData, MigrationJobResult>> {
    const jobName = `migration-${data.migration?.id}`;

    const defaultOptions: JobsOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: {
        count: 100,
        age: 3600 * 24, // keep completed for 24h
      },
      removeOnFail: {
        count: 200,
      },
      ...options,
    };

    const job = await this.migrationQueue.add(jobName, data, defaultOptions);
    this.logger.log(
      `[BullMQ] Enqueued migration job: "${job.name}" (ID: ${job.id})`,
    );
    return job;
  }

  /**
   * Retrieve a job by its ID
   */
  async getJob(
    jobId: string,
  ): Promise<Job<MigrationJobData, MigrationJobResult> | undefined> {
    return this.migrationQueue.getJob(jobId);
  }

  /**
   * Get overall metrics for the migration queue
   */
  async getQueueMetrics(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  }> {
    const [waiting, active, completed, failed, delayed, isPaused] =
      await Promise.all([
        this.migrationQueue.getWaitingCount(),
        this.migrationQueue.getActiveCount(),
        this.migrationQueue.getCompletedCount(),
        this.migrationQueue.getFailedCount(),
        this.migrationQueue.getDelayedCount(),
        this.migrationQueue.isPaused(),
      ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: isPaused,
    };
  }

  /**
   * Pause queue processing
   */
  async pauseQueue(): Promise<void> {
    await this.migrationQueue.pause();
    this.logger.warn('[BullMQ] Migration queue has been PAUSED');
  }

  /**
   * Resume queue processing
   */
  async resumeQueue(): Promise<void> {
    await this.migrationQueue.resume();
    this.logger.log('[BullMQ] Migration queue has been RESUMED');
  }

  /**
   * Clean jobs from the queue
   */
  async cleanQueue(): Promise<void> {
    await this.migrationQueue.clean(0, 1000, 'completed');
    await this.migrationQueue.clean(0, 1000, 'failed');
    this.logger.log('[BullMQ] Cleared completed and failed jobs from queue');
  }
}
