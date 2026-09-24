import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { OPTIMIZED_JOBS_QUEUE } from './optimized-background-jobs.types';
import type {
  PlaygroundJobData,
  PlaygroundJobResult,
} from './optimized-background-jobs.types';
import { MetricsService } from '../metrics/metrics.service';

@Processor(OPTIMIZED_JOBS_QUEUE, {
  concurrency: Number(process.env.PLAYGROUND_QUEUE_CONCURRENCY) || 3,
})
export class OptimizedBackgroundJobsProcessor extends WorkerHost {
  private readonly logger = new Logger(OptimizedBackgroundJobsProcessor.name);

  constructor(private readonly metricsService: MetricsService) {
    super();
  }

  /**
   * Main processor executing playground test scenarios
   */
  async process(
    job: Job<PlaygroundJobData, PlaygroundJobResult, string>,
  ): Promise<PlaygroundJobResult> {
    const startTime = Date.now();
    const { id, name, data } = job;
    const type = data.type || 'simple';

    this.logger.log(
      `[Playground Worker] Processing Job #${id} ("${name}") of type "${type}"`,
    );
    await job.log(
      `Started job #${id} [type: ${type}] at ${new Date().toISOString()}`,
    );

    switch (type) {
      case 'progress': {
        const steps = data.steps || 5;
        const stepDelay = data.durationMs || 1000;

        for (let i = 1; i <= steps; i++) {
          await new Promise((resolve) => setTimeout(resolve, stepDelay));
          const percentage = Math.round((i / steps) * 100);

          await job.updateProgress({
            percentage,
            currentStep: i,
            totalSteps: steps,
            status: i === steps ? 'Finished' : 'In Progress',
          });

          await job.log(
            `Step ${i}/${steps} completed (${percentage}%). Step delay: ${stepDelay}ms`,
          );
        }
        break;
      }

      case 'failing': {
        const currentAttempt = job.attemptsMade + 1;
        const maxAttempts = job.opts.attempts || 1;
        const errorMsg =
          data.errorMessage ||
          'Simulated Service Exception (HTTP 500 Internal Server Error)';

        await job.log(
          `Executing simulated failing task. Attempt: ${currentAttempt}/${maxAttempts}`,
        );

        // If permanent failure or failUntilAttempt is not reached, throw an error so it lands in the Failed tab
        const shouldFail =
          data.failPermanently !== false &&
          (data.failUntilAttempt === undefined ||
            currentAttempt < data.failUntilAttempt);

        if (shouldFail) {
          await job.log(
            `[Failure Triggered] Throwing intentional error on attempt #${currentAttempt}. Error: ${errorMsg}`,
          );
          throw new Error(
            `[Simulated Failure] ${errorMsg} (Attempt ${currentAttempt}/${maxAttempts})`,
          );
        }

        await job.log(
          `Success achieved on attempt #${currentAttempt}! Task completed successfully.`,
        );
        break;
      }

      case 'heavy-compute': {
        const iterations = data.steps || 5;
        await job.log(
          `Starting simulated compute workload (${iterations} rounds)...`,
        );

        for (let round = 1; round <= iterations; round++) {
          let count = 0;
          for (let i = 2; i < 250000; i++) {
            let isPrime = true;
            for (let j = 2; j * j <= i; j++) {
              if (i % j === 0) {
                isPrime = false;
                break;
              }
            }
            if (isPrime) count++;
          }

          const percent = Math.round((round / iterations) * 100);
          await job.updateProgress({
            percentage: percent,
            currentStep: round,
            totalSteps: iterations,
            status: `Found ${count} primes in round ${round}`,
          });
          await job.log(
            `Round ${round}/${iterations}: found ${count} primes (${percent}%)`,
          );
        }
        break;
      }

      case 'delayed': {
        const delay = data.durationMs || 2000;
        await job.log(
          `Job executed after delay. Simulating final processing of ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
        break;
      }

      case 'custom':
      case 'simple':
      default: {
        const duration = data.durationMs || 500;
        await job.log(
          `Processing payload: ${JSON.stringify(data.payload || {})}`,
        );
        await new Promise((resolve) => setTimeout(resolve, duration));
        await job.updateProgress(100);
        break;
      }
    }

    const durationMs = Date.now() - startTime;
    await job.log(`Completed job #${id} in ${durationMs}ms`);

    return {
      success: true,
      jobId: String(id),
      jobName: name,
      jobType: type,
      executedAt: new Date().toISOString(),
      durationMs,
      output: data.payload || { status: 'OK' },
      attemptsMade: job.attemptsMade + 1,
      message: `Job #${id} (${type}) executed successfully in ${durationMs}ms`,
    };
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(`[Playground Worker] Job #${job.id} is now ACTIVE`);
    const jobType = job.data?.type || 'simple';
    this.metricsService.recordJobActive(OPTIMIZED_JOBS_QUEUE, jobType, job.timestamp);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: PlaygroundJobResult) {
    this.logger.log(
      `[Playground Worker] Job #${job.id} COMPLETED in ${result?.durationMs || 0}ms`,
    );
    const jobType = job.data?.type || 'simple';
    this.metricsService.recordJobCompleted(
      OPTIMIZED_JOBS_QUEUE,
      jobType,
      result?.durationMs || 0,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `[Playground Worker] Job #${job.id} FAILED: ${error.message}`,
    );
    const jobType = job.data?.type || 'simple';
    const errorType =
      job.data?.payload?.category ||
      (error.message.includes('ETIMEDOUT')
        ? 'database_timeout_blip'
        : error.message.includes('503') || error.message.includes('429')
          ? 'transient_rate_limit'
          : error.message.includes('foreign key') || error.message.includes('Constraint')
            ? 'poison_pill_schema'
            : error.message.includes('ECONNREFUSED')
              ? 'downstream_hard_outage'
              : error.name || 'JobError');

    this.metricsService.recordJobFailed(
      OPTIMIZED_JOBS_QUEUE,
      jobType,
      errorType,
    );
    if (job.attemptsMade > 0) {
      this.metricsService.recordJobRetried(OPTIMIZED_JOBS_QUEUE);
    }
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(`[Playground Worker] Job #${jobId} STALLED (reclaimed by BullMQ)`);
    this.metricsService.recordJobStalled(OPTIMIZED_JOBS_QUEUE);
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job, progress: any) {
    this.logger.debug(
      `[Playground Worker] Job #${job.id} Progress: ${JSON.stringify(progress)}`,
    );
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.error(
      `[Playground Worker] Worker error: ${error.message}`,
      error.stack,
    );
    this.metricsService.recordWorkerError(OPTIMIZED_JOBS_QUEUE);
  }

  /**
   * Dynamically adjust the worker concurrency at runtime
   */
  setConcurrency(newConcurrency: number): number {
    if (this.worker) {
      this.worker.concurrency = newConcurrency;
      this.logger.log(
        `[Playground Worker] Concurrency dynamically updated to ${newConcurrency}`,
      );
      return this.worker.concurrency;
    }
    throw new Error('Worker instance not initialized yet');
  }

  getConcurrency(): number {
    return this.worker?.concurrency || Number(process.env.PLAYGROUND_QUEUE_CONCURRENCY) || 3;
  }
}
