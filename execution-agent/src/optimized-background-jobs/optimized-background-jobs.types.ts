export const OPTIMIZED_JOBS_QUEUE = 'optimized-jobs';

export type PlaygroundJobType =
  | 'simple'
  | 'progress'
  | 'delayed'
  | 'failing'
  | 'heavy-compute'
  | 'custom';

export interface PlaygroundJobData {
  title?: string;
  type?: PlaygroundJobType;
  durationMs?: number;
  steps?: number;
  failUntilAttempt?: number;
  failPermanently?: boolean;
  errorMessage?: string;
  payload?: Record<string, any>;
  [key: string]: any;
}

export interface PlaygroundJobResult {
  success: boolean;
  jobId: string;
  jobName: string;
  jobType: PlaygroundJobType;
  executedAt: string;
  durationMs: number;
  output?: any;
  attemptsMade?: number;
  message?: string;
}

export interface PlaygroundJobProgress {
  percentage: number;
  currentStep: number;
  totalSteps: number;
  status: string;
  info?: string;
}

export interface OptimizedQueueMetrics {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  timestamp: string;
}
