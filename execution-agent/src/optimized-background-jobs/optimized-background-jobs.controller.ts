import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { OptimizedBackgroundJobsService } from './optimized-background-jobs.service';
import { OptimizedBackgroundJobsProcessor } from './optimized-background-jobs.processor';
import type {
  PlaygroundJobData,
  OptimizedQueueMetrics,
} from './optimized-background-jobs.types';
import type { JobsOptions } from 'bullmq';

@Controller('optimized-jobs')
export class OptimizedBackgroundJobsController {
  constructor(
    private readonly jobsService: OptimizedBackgroundJobsService,
    private readonly processor: OptimizedBackgroundJobsProcessor,
  ) {}

  /**
   * Create a customizable playground test job
   */
  @Post('create')
  @HttpCode(HttpStatus.ACCEPTED)
  async createJob(
    @Body()
    body: {
      data?: PlaygroundJobData;
      options?: JobsOptions;
      // Flat properties support
      title?: string;
      type?: any;
      durationMs?: number;
      steps?: number;
      failUntilAttempt?: number;
      payload?: Record<string, any>;
    },
  ) {
    const jobData: PlaygroundJobData = body.data || {
      title: body.title,
      type: body.type,
      durationMs: body.durationMs,
      steps: body.steps,
      failUntilAttempt: body.failUntilAttempt,
      payload: body.payload,
    };

    const job = await this.jobsService.addJob(jobData, body.options);

    return {
      success: true,
      message: 'Playground test job enqueued in BullMQ',
      jobId: job.id,
      name: job.name,
      queue: job.queueName,
      type: jobData.type || 'simple',
    };
  }

  /**
   * Quick-trigger: Multi-step progress job for testing live progress in BullBoard
   */
  @Post('sample/progress')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerProgressSample(
    @Body() body: { steps?: number; stepDelayMs?: number; title?: string },
  ) {
    const job = await this.jobsService.createProgressJob(
      body?.title || 'Live Progress Demonstration',
      body?.steps ?? 6,
      body?.stepDelayMs ?? 1500,
    );

    return {
      success: true,
      message: 'Multi-step progress job enqueued. Watch it update live in BullBoard at /admin/queues',
      jobId: job.id,
      name: job.name,
    };
  }

  /**
   * Quick-trigger: Failing job for testing error stack traces and manual retry in BullBoard
   */
  @Post('sample/failing')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerFailingSample(
    @Body()
    body?: {
      failUntilAttempt?: number;
      failPermanently?: boolean;
      attempts?: number;
      title?: string;
      errorMessage?: string;
    },
  ) {
    const job = await this.jobsService.createFailingJob(
      body?.title || 'Simulated Failure Job',
      {
        failUntilAttempt: body?.failUntilAttempt,
        failPermanently: body?.failPermanently,
        attempts: body?.attempts,
        errorMessage: body?.errorMessage,
      },
    );

    return {
      success: true,
      message:
        'Failing job enqueued. It will fail and appear in the "Failed" tab in BullBoard at /admin/queues',
      jobId: job.id,
      name: job.name,
    };
  }

  /**
   * Quick-trigger: Delayed job for testing the Delayed tab in BullBoard
   */
  @Post('sample/delayed')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerDelayedSample(
    @Body() body: { delayMs?: number; title?: string },
  ) {
    const delay = body?.delayMs ?? 10000;
    const job = await this.jobsService.createDelayedJob(
      body?.title || `Delayed Job (${delay / 1000}s)`,
      delay,
    );

    return {
      success: true,
      message: `Delayed job enqueued for execution in ${delay / 1000} seconds. Check 'Delayed' tab in BullBoard.`,
      jobId: job.id,
      name: job.name,
      delayMs: delay,
    };
  }

  /**
   * Quick-trigger: Bulk sample jobs
   */
  @Post('sample/bulk')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerBulkSample(@Body() body: { count?: number }) {
    const count = body?.count ?? 5;
    const jobs = Array.from({ length: count }).map((_, idx) => ({
      data: {
        title: `Bulk Sample Job #${idx + 1}`,
        type: (idx % 2 === 0 ? 'simple' : 'progress') as any,
        steps: 3,
        durationMs: 800,
        payload: { itemNumber: idx + 1, batchId: Date.now() },
      },
    }));

    const enqueued = await this.jobsService.addBulkJobs(jobs);

    return {
      success: true,
      message: `Bulk enqueued ${enqueued.length} sample jobs`,
      jobIds: enqueued.map((j) => j.id),
    };
  }

  /**
   * Queue counts and metrics
   */
  @Get('metrics')
  async getMetrics(): Promise<OptimizedQueueMetrics> {
    return this.jobsService.getQueueMetrics();
  }

  /**
   * Pause the queue
   */
  @Post('queue/pause')
  async pauseQueue() {
    return this.jobsService.pauseQueue();
  }

  /**
   * Resume the queue
   */
  @Post('queue/resume')
  async resumeQueue() {
    return this.jobsService.resumeQueue();
  }

  /**
   * Get current worker concurrency
   */
  @Get('concurrency')
  getConcurrency() {
    return {
      queue: 'optimized-jobs',
      concurrency: this.processor.getConcurrency(),
    };
  }

  /**
   * Dynamically adjust worker concurrency at runtime
   */
  @Post('concurrency')
  setConcurrency(@Body() body: { concurrency: number }) {
    const newConcurrency = Number(body?.concurrency);
    if (!newConcurrency || newConcurrency < 1 || !Number.isFinite(newConcurrency)) {
      return {
        success: false,
        message: 'Invalid concurrency value. Must be a positive integer >= 1.',
      };
    }

    const previousConcurrency = this.processor.getConcurrency();
    const updated = this.processor.setConcurrency(newConcurrency);

    return {
      success: true,
      message: `Worker concurrency updated from ${previousConcurrency} to ${updated}`,
      previousConcurrency,
      concurrency: updated,
    };
  }

  /**
   * Clean jobs from the queue
   */
  @Post('queue/clean')
  async cleanQueue(
    @Query('type') type?: 'completed' | 'failed' | 'wait' | 'active' | 'delayed',
    @Query('grace') grace?: string,
    @Query('limit') limit?: string,
  ) {
    return this.jobsService.cleanQueue(
      grace ? parseInt(grace, 10) : 0,
      limit ? parseInt(limit, 10) : 1000,
      type || 'completed',
    );
  }

  /**
   * Get job status, state, progress, and logs
   */
  @Get(':jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    const { job, state, progress, logs } = await this.jobsService.getJob(jobId);

    if (!job) {
      return {
        success: false,
        message: `Job #${jobId} not found in playground queue`,
      };
    }

    return {
      success: true,
      jobId: job.id,
      name: job.name,
      state,
      progress,
      logs: logs || [],
      failedReason: job.failedReason,
      returnvalue: job.returnvalue,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  }

  /**
   * Retry a failed job
   */
  @Post(':jobId/retry')
  async retryJob(@Param('jobId') jobId: string) {
    return this.jobsService.retryJob(jobId);
  }

  /**
   * Remove a job from the queue
   */
  @Delete(':jobId')
  async removeJob(@Param('jobId') jobId: string) {
    return this.jobsService.removeJob(jobId);
  }
}
