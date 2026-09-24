import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as client from 'prom-client';
import { MIGRATION_QUEUE } from '../background-jobs/background-jobs.types';
import { OPTIMIZED_JOBS_QUEUE } from '../optimized-background-jobs/optimized-background-jobs.types';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new Logger(MetricsService.name);
  public readonly registry: client.Registry;

  // BullMQ Counters
  public readonly jobsAddedCounter: client.Counter<string>;
  public readonly jobsCompletedCounter: client.Counter<string>;
  public readonly jobsFailedCounter: client.Counter<string>;
  public readonly jobsStalledCounter: client.Counter<string>;
  public readonly jobsRetriedCounter: client.Counter<string>;
  public readonly workerErrorsCounter: client.Counter<string>;

  // BullMQ Histograms
  public readonly jobDurationHistogram: client.Histogram<string>;
  public readonly jobWaitTimeHistogram: client.Histogram<string>;

  // BullMQ Gauges
  public readonly queueWaitingGauge: client.Gauge<string>;
  public readonly queueActiveGauge: client.Gauge<string>;
  public readonly queueCompletedGauge: client.Gauge<string>;
  public readonly queueFailedGauge: client.Gauge<string>;
  public readonly queueDelayedGauge: client.Gauge<string>;
  public readonly queuePrioritizedGauge: client.Gauge<string>;
  public readonly queuePausedGauge: client.Gauge<string>;
  public readonly activeWorkersGauge: client.Gauge<string>;
  public readonly redisStatusGauge: client.Gauge<string>;

  // DataForge Domain Specific Gauges & Counters
  public readonly migrationRowsTotal: client.Counter<string>;
  public readonly migrationThroughputGauge: client.Gauge<string>;
  public readonly dbPoolConnectionsGauge: client.Gauge<string>;

  constructor(
    @InjectQueue(MIGRATION_QUEUE)
    private readonly migrationQueue: Queue,
    @InjectQueue(OPTIMIZED_JOBS_QUEUE)
    private readonly playgroundQueue: Queue,
  ) {
    this.registry = new client.Registry();

    // Default Node.js process metrics (event loop lag, CPU, memory, GC, active handles)
    client.collectDefaultMetrics({
      register: this.registry,
      prefix: 'dataforge_',
    });

    // 1. Ingestion / Addition Counter
    this.jobsAddedCounter = new client.Counter({
      name: 'bullmq_jobs_added_total',
      help: 'Total number of jobs enqueued into BullMQ by producers',
      labelNames: ['queue', 'job_type'],
      registers: [this.registry],
    });

    // 2. Completed Counter
    this.jobsCompletedCounter = new client.Counter({
      name: 'bullmq_jobs_completed_total',
      help: 'Total number of BullMQ jobs successfully completed',
      labelNames: ['queue', 'job_type'],
      registers: [this.registry],
    });

    // 3. Failed Counter
    this.jobsFailedCounter = new client.Counter({
      name: 'bullmq_jobs_failed_total',
      help: 'Total number of BullMQ jobs that ended in failure',
      labelNames: ['queue', 'job_type', 'error_type'],
      registers: [this.registry],
    });

    // 4. Stalled Counter
    this.jobsStalledCounter = new client.Counter({
      name: 'bullmq_jobs_stalled_total',
      help: 'Total number of times jobs stalled due to worker crash or event-loop freeze',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    // 5. Retried Counter
    this.jobsRetriedCounter = new client.Counter({
      name: 'bullmq_jobs_retried_total',
      help: 'Total number of job retry attempts executed',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    // 6. Worker Errors Counter
    this.workerErrorsCounter = new client.Counter({
      name: 'bullmq_worker_errors_total',
      help: 'Total number of worker connection or Redis stream exceptions',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    // 7. Execution Duration Histogram
    this.jobDurationHistogram = new client.Histogram({
      name: 'bullmq_job_duration_seconds',
      help: 'Execution duration of completed jobs in seconds',
      labelNames: ['queue', 'job_type'],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 120, 300],
      registers: [this.registry],
    });

    // 8. Queue Wait Latency (Time-in-Queue from enqueue to processing)
    this.jobWaitTimeHistogram = new client.Histogram({
      name: 'bullmq_job_waiting_time_seconds',
      help: 'Duration a job spent waiting in queue before a worker picked it up',
      labelNames: ['queue', 'job_type'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10, 30, 60, 300],
      registers: [this.registry],
    });

    // 9. Queue State Gauges
    this.queueWaitingGauge = new client.Gauge({
      name: 'bullmq_queue_waiting_jobs',
      help: 'Current number of jobs waiting in backlog',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.queueActiveGauge = new client.Gauge({
      name: 'bullmq_queue_active_jobs',
      help: 'Current number of jobs actively being processed by workers',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.queueCompletedGauge = new client.Gauge({
      name: 'bullmq_queue_completed_jobs',
      help: 'Current count of jobs in completed state in Redis',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.queueFailedGauge = new client.Gauge({
      name: 'bullmq_queue_failed_jobs',
      help: 'Current count of jobs in failed state in Redis',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.queueDelayedGauge = new client.Gauge({
      name: 'bullmq_queue_delayed_jobs',
      help: 'Current number of jobs scheduled for delayed execution',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.queuePrioritizedGauge = new client.Gauge({
      name: 'bullmq_queue_prioritized_jobs',
      help: 'Current number of prioritized jobs awaiting processing',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.queuePausedGauge = new client.Gauge({
      name: 'bullmq_queue_is_paused',
      help: 'Whether the queue is paused (1) or active (0)',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.activeWorkersGauge = new client.Gauge({
      name: 'bullmq_active_workers_count',
      help: 'Number of active worker processes/threads registered in Redis for the queue',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.redisStatusGauge = new client.Gauge({
      name: 'bullmq_redis_connection_status',
      help: 'Connection status of Redis client (1 = connected/healthy, 0 = disconnected)',
      registers: [this.registry],
    });

    // 10. DataForge Migration Data Pipeline Metrics
    this.migrationRowsTotal = new client.Counter({
      name: 'dataforge_migration_rows_processed_total',
      help: 'Total data migration rows transferred through the execution agent pipeline',
      registers: [this.registry],
    });

    this.migrationThroughputGauge = new client.Gauge({
      name: 'dataforge_migration_throughput_rows_per_second',
      help: 'Live throughput rate in rows per second',
      registers: [this.registry],
    });

    this.dbPoolConnectionsGauge = new client.Gauge({
      name: 'dataforge_db_pool_connections',
      help: 'PostgreSQL connection pool client allocation status',
      labelNames: ['state'], // 'active', 'idle', 'waiting'
      registers: [this.registry],
    });
  }

  onModuleInit() {
    this.logger.log('Prometheus MetricsService initialized with custom BullMQ collectors');
  }

  /**
   * Refreshes all dynamic queue state gauges before Prometheus scrapes /metrics
   */
  async collectLiveMetrics(): Promise<string> {
    await Promise.all([
      this.syncQueueMetrics(this.migrationQueue, MIGRATION_QUEUE),
      this.syncQueueMetrics(this.playgroundQueue, OPTIMIZED_JOBS_QUEUE),
      this.checkRedisHealth(),
    ]);

    return this.registry.metrics();
  }

  private async syncQueueMetrics(queue: Queue, queueName: string): Promise<void> {
    try {
      const [
        waiting,
        active,
        completed,
        failed,
        delayed,
        prioritized,
        isPaused,
        workersCount,
      ] = await Promise.all([
        queue.getWaitingCount().catch(() => 0),
        queue.getActiveCount().catch(() => 0),
        queue.getCompletedCount().catch(() => 0),
        queue.getFailedCount().catch(() => 0),
        queue.getDelayedCount().catch(() => 0),
        queue.getPrioritizedCount().catch(() => 0),
        queue.isPaused().catch(() => false),
        queue.getWorkersCount().catch(() => 0),
      ]);

      this.queueWaitingGauge.set({ queue: queueName }, waiting);
      this.queueActiveGauge.set({ queue: queueName }, active);
      this.queueCompletedGauge.set({ queue: queueName }, completed);
      this.queueFailedGauge.set({ queue: queueName }, failed);
      this.queueDelayedGauge.set({ queue: queueName }, delayed);
      this.queuePrioritizedGauge.set({ queue: queueName }, prioritized);
      this.queuePausedGauge.set({ queue: queueName }, isPaused ? 1 : 0);
      this.activeWorkersGauge.set({ queue: queueName }, workersCount);
    } catch (err: any) {
      this.logger.warn(`Failed to collect live metrics for queue ${queueName}: ${err.message}`);
    }
  }

  private async checkRedisHealth(): Promise<void> {
    try {
      await this.playgroundQueue.waitUntilReady();
      this.redisStatusGauge.set(1);
    } catch {
      this.redisStatusGauge.set(0);
    }
  }

  // --- Helper Methods for Worker Processors & Services ---

  recordJobAdded(queue: string, jobType = 'simple') {
    this.jobsAddedCounter.inc({ queue, job_type: jobType });
  }

  recordJobActive(queue: string, jobType = 'simple', enqueueTimestamp?: number) {
    if (enqueueTimestamp) {
      const waitTimeSec = Math.max(0, (Date.now() - enqueueTimestamp) / 1000);
      this.jobWaitTimeHistogram.observe({ queue, job_type: jobType }, waitTimeSec);
    }
  }

  recordJobCompleted(queue: string, jobType = 'simple', durationMs: number) {
    const durationSec = Math.max(0, durationMs / 1000);
    this.jobsCompletedCounter.inc({ queue, job_type: jobType });
    this.jobDurationHistogram.observe({ queue, job_type: jobType }, durationSec);
  }

  recordJobFailed(queue: string, jobType = 'simple', errorType: string) {
    this.jobsFailedCounter.inc({ queue, job_type: jobType, error_type: errorType });
  }

  recordJobStalled(queue: string) {
    this.jobsStalledCounter.inc({ queue });
  }

  recordJobRetried(queue: string) {
    this.jobsRetriedCounter.inc({ queue });
  }

  recordWorkerError(queue: string) {
    this.workerErrorsCounter.inc({ queue });
  }

  recordMigrationRows(rowsCount: number, rowsPerSecond?: number) {
    this.migrationRowsTotal.inc(rowsCount);
    if (rowsPerSecond !== undefined) {
      this.migrationThroughputGauge.set(rowsPerSecond);
    }
  }

  recordDbPoolStatus(active: number, idle: number, waiting: number) {
    this.dbPoolConnectionsGauge.set({ state: 'active' }, active);
    this.dbPoolConnectionsGauge.set({ state: 'idle' }, idle);
    this.dbPoolConnectionsGauge.set({ state: 'waiting' }, waiting);
  }
}
