import { sleep } from 'k6';
import { enqueueJob, pauseQueue, resumeQueue } from './common.js';

export const options = {
  scenarios: {
    backlog_burst_simulation: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '5s', target: 20 },  // Sudden surge of 20 concurrent producers
        { duration: '15s', target: 20 }, // Heavy burst flooding the queue
        { duration: '5s', target: 2 },   // Surge subsides
        { duration: '30s', target: 1 },  // Slow monitoring while workers drain
      ],
    },
  },
};

// Lifecycle: Pause the queue initially to accumulate backlog, then resume
export function setup() {
  console.log('⚡ [Setup] Pausing queue to simulate temporary worker unavailability / backlog accumulation...');
  pauseQueue();
  return { pausedAt: new Date().toISOString() };
}

export default function () {
  const iteration = __ITER;
  const vu = __VU;

  // Enqueue a burst of jobs with varying durations
  enqueueJob({
    title: `Backlog Burst Job [VU ${vu} - #${iteration}]`,
    type: iteration % 4 === 0 ? 'progress' : 'simple',
    durationMs: 600,
    steps: 3,
    payload: {
      burstBatch: true,
      vu,
      iteration,
      enqueuedAt: new Date().toISOString(),
    },
  });

  // Short pause before enqueuing next burst item
  sleep(0.15);
}

// Teardown: Ensure queue is resumed and drained
export function teardown() {
  console.log('🚀 [Teardown] Resuming queue so workers can aggressively drain the accumulated backlog...');
  resumeQueue();
}
