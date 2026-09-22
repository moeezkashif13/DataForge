import { Test, TestingModule } from '@nestjs/testing';
import { OptimizedBackgroundJobsController } from './optimized-background-jobs.controller';
import { OptimizedBackgroundJobsService } from './optimized-background-jobs.service';

describe('OptimizedBackgroundJobsController', () => {
  let controller: OptimizedBackgroundJobsController;
  let service: Partial<OptimizedBackgroundJobsService>;

  beforeEach(async () => {
    service = {
      addJob: jest.fn().mockResolvedValue({
        id: 'play-job-123',
        name: 'test-job',
        queueName: 'optimized-jobs',
      }),
      addBulkJobs: jest.fn().mockResolvedValue([
        { id: 'play-job-1' },
        { id: 'play-job-2' },
      ]),
      createProgressJob: jest.fn().mockResolvedValue({
        id: 'progress-job-1',
        name: 'progress-test',
      }),
      createFailingJob: jest.fn().mockResolvedValue({
        id: 'failing-job-1',
        name: 'failing-test',
      }),
      createDelayedJob: jest.fn().mockResolvedValue({
        id: 'delayed-job-1',
        name: 'delayed-test',
      }),
      getQueueMetrics: jest.fn().mockResolvedValue({
        queueName: 'optimized-jobs',
        waiting: 2,
        active: 1,
        completed: 10,
        failed: 0,
        delayed: 0,
        paused: false,
        timestamp: new Date().toISOString(),
      }),
      getJob: jest.fn().mockResolvedValue({
        job: {
          id: 'play-job-123',
          name: 'test-job',
          progress: 50,
          attemptsMade: 1,
        },
        state: 'active',
        progress: 50,
        logs: ['log 1', 'log 2'],
      }),
      retryJob: jest.fn().mockResolvedValue({
        success: true,
        message: 'Job #play-job-123 retried successfully',
      }),
      removeJob: jest.fn().mockResolvedValue({
        success: true,
        message: 'Job #play-job-123 removed successfully',
      }),
      pauseQueue: jest.fn().mockResolvedValue({
        success: true,
        message: 'Queue paused successfully',
      }),
      resumeQueue: jest.fn().mockResolvedValue({
        success: true,
        message: 'Queue resumed successfully',
      }),
      cleanQueue: jest.fn().mockResolvedValue({
        success: true,
        cleanedCount: 5,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OptimizedBackgroundJobsController],
      providers: [
        {
          provide: OptimizedBackgroundJobsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<OptimizedBackgroundJobsController>(
      OptimizedBackgroundJobsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a generic playground job', async () => {
    const result = await controller.createJob({
      title: 'Simple Playground Test',
      type: 'simple',
    });

    expect(result.success).toBe(true);
    expect(result.jobId).toBe('play-job-123');
    expect(service.addJob).toHaveBeenCalled();
  });

  it('should trigger sample progress job', async () => {
    const result = await controller.triggerProgressSample({ steps: 4 });
    expect(result.success).toBe(true);
    expect(result.jobId).toBe('progress-job-1');
    expect(service.createProgressJob).toHaveBeenCalled();
  });

  it('should trigger sample failing job', async () => {
    const result = await controller.triggerFailingSample({ failUntilAttempt: 2 });
    expect(result.success).toBe(true);
    expect(result.jobId).toBe('failing-job-1');
    expect(service.createFailingJob).toHaveBeenCalled();
  });

  it('should trigger sample delayed job', async () => {
    const result = await controller.triggerDelayedSample({ delayMs: 5000 });
    expect(result.success).toBe(true);
    expect(result.jobId).toBe('delayed-job-1');
    expect(service.createDelayedJob).toHaveBeenCalled();
  });

  it('should trigger bulk jobs sample', async () => {
    const result = await controller.triggerBulkSample({ count: 2 });
    expect(result.success).toBe(true);
    expect(service.addBulkJobs).toHaveBeenCalled();
  });

  it('should get queue metrics', async () => {
    const metrics = await controller.getMetrics();
    expect(metrics.queueName).toBe('optimized-jobs');
    expect(metrics.waiting).toBe(2);
  });

  it('should get job status and logs', async () => {
    const res = await controller.getJobStatus('play-job-123');
    expect(res.success).toBe(true);
    expect(res.jobId).toBe('play-job-123');
    expect(res.logs).toHaveLength(2);
  });
});
