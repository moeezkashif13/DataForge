import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions, Job } from 'bullmq';
import {
  OPTIMIZED_JOBS_QUEUE,
  PlaygroundJobData,
  PlaygroundJobResult,
  OptimizedQueueMetrics,
} from './optimized-background-jobs.types';

@Injectable()
export class OptimizedBackgroundJobsService {
  private readonly logger = new Logger(OptimizedBackgroundJobsService.name);

  constructor(
    @InjectQueue(OPTIMIZED_JOBS_QUEUE)
    private readonly queue: Queue,
  ) {}

  /**
   * Enqueue a playground test job into BullMQ
   */
  async addJob(
    data: PlaygroundJobData,
    options?: JobsOptions,
  ): Promise<Job<PlaygroundJobData, PlaygroundJobResult>> {
    const jobType = data.type || 'simple';
    const jobName = `${jobType}-${Date.now().toString(36)}`;

    const defaultOptions: JobsOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        count: 500,
        age: 86400, // keep for 24 hours
      },
      removeOnFail: {
        count: 500,
      },
      ...options,
    };

    const job = await this.queue.add(jobName, data, defaultOptions);
    this.logger.log(
      `[Playground Queue] Enqueued "${job.name}" (ID: ${job.id}, Type: ${jobType})`,
    );
    return job;
  }

  /**
   * Enqueue multiple test jobs in bulk
   */
  async addBulkJobs(
    jobs: Array<{
      data: PlaygroundJobData;
      options?: JobsOptions;
    }>,
  ): Promise<Job<PlaygroundJobData, PlaygroundJobResult>[]> {
    const bulkData = jobs.map((item, idx) => ({
      name: `${item.data.type || 'bulk'}-${idx + 1}-${Date.now().toString(36)}`,
      data: item.data,
      opts: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 500 },
        ...item.options,
      },
    }));

    const enqueuedJobs = await this.queue.addBulk(bulkData);
    this.logger.log(
      `[Playground Queue] Bulk enqueued ${enqueuedJobs.length} jobs successfully`,
    );
    return enqueuedJobs;
  }

  /**
   * Quick-trigger: Multi-step progress job to test BullBoard live progress bar
   */
  async createProgressJob(
    title = 'Live Progress Playground Job',
    steps = 5,
    stepDelayMs = 1000,
  ): Promise<Job<PlaygroundJobData, PlaygroundJobResult>> {
    return this.addJob({
      title,
      type: 'progress',
      steps,
      durationMs: stepDelayMs,
    });
  }

  /**
   * Quick-trigger: Failing job to test error stack traces and manual retry in BullBoard.
   * By default, it fails permanently so it lands in BullBoard's "Failed" tab.
   */
  async createFailingJob(
    title = 'Simulated Failing Job',
    options?: {
      failUntilAttempt?: number;
      failPermanently?: boolean;
      attempts?: number;
      errorMessage?: string;
    },
  ): Promise<Job<PlaygroundJobData, PlaygroundJobResult>> {
    const isPermanent =
      options?.failPermanently ?? options?.failUntilAttempt === undefined;
    const attempts = options?.attempts ?? 1;

    return this.addJob(
      {
        title,
        type: 'failing',
        failPermanently: isPermanent,
        failUntilAttempt: options?.failUntilAttempt,
        errorMessage:
          options?.errorMessage ||
          'Simulated Service Exception (HTTP 500 Internal Server Error)',
      },
      {
        attempts,
        backoff: {
          type: 'fixed',
          delay: 2000,
        },
      },
    );
  }

  /**
   * Quick-trigger: Delayed job to test "Delayed" tab in BullBoard
   */
  async createDelayedJob(
    title = 'Simulated Delayed Job',
    delayMs = 10000,
  ): Promise<Job<PlaygroundJobData, PlaygroundJobResult>> {
    return this.addJob(
      {
        title,
        type: 'delayed',
        durationMs: delayMs,
      },
      {
        delay: delayMs,
      },
    );
  }

  /**
   * Retrieve job details, state, progress, and logs
   */
  async getJob(jobId: string): Promise<{
    job: Job<PlaygroundJobData, PlaygroundJobResult> | null;
    state?: string;
    progress?: any;
    logs?: string[];
  }> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return { job: null };
    }

    const [state, logsData] = await Promise.all([
      job.getState(),
      this.queue.getJobLogs(jobId).catch(() => ({ logs: [] })),
    ]);

    return {
      job,
      state,
      progress: job.progress,
      logs: logsData.logs,
    };
  }

  /**
   * Get queue counts and operational state
   */
  async getQueueMetrics(): Promise<OptimizedQueueMetrics> {
    const [waiting, active, completed, failed, delayed, isPaused] =
      await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount(),
        this.queue.isPaused(),
      ]);

    return {
      queueName: OPTIMIZED_JOBS_QUEUE,
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: isPaused,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Pause queue processing
   */
  async pauseQueue(): Promise<{ success: boolean; message: string }> {
    await this.queue.pause();
    this.logger.warn('[Playground Queue] Queue paused');
    return { success: true, message: 'Queue paused successfully' };
  }

  /**
   * Resume queue processing
   */
  async resumeQueue(): Promise<{ success: boolean; message: string }> {
    await this.queue.resume();
    this.logger.log('[Playground Queue] Queue resumed');
    return { success: true, message: 'Queue resumed successfully' };
  }

  /**
   * Clean jobs from queue
   */
  async cleanQueue(
    grace = 0,
    limit = 1000,
    type: 'completed' | 'failed' | 'wait' | 'active' | 'delayed' = 'completed',
  ): Promise<{ success: boolean; cleanedCount: number }> {
    const cleaned = await this.queue.clean(grace, limit, type);
    this.logger.log(
      `[Playground Queue] Cleaned ${cleaned.length} ${type} jobs from queue`,
    );
    return { success: true, cleanedCount: cleaned.length };
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<{ success: boolean; message: string }> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job #${jobId} not found in playground queue`);
    }

    await job.retry();
    this.logger.log(`[Playground Queue] Retried job #${jobId}`);
    return { success: true, message: `Job #${jobId} retried successfully` };
  }

  /**
   * Remove a job from queue
   */
  async removeJob(jobId: string): Promise<{ success: boolean; message: string }> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job #${jobId} not found in playground queue`);
    }

    await job.remove();
    this.logger.log(`[Playground Queue] Removed job #${jobId}`);
    return { success: true, message: `Job #${jobId} removed successfully` };
  }
}
