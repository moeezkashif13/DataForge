import { sleep } from 'k6';
import { enqueueJob } from './common.js';

export const options = {
  scenarios: {
    priority_queue_test: {
      executor: 'shared-iterations',
      vus: 2,
      iterations: 35,
      maxDuration: '40s',
    },
  },
};

export default function () {
  const iteration = __ITER;

  if (iteration < 25) {
    // First 25 jobs: Low-priority background tasks (Priority 20)
    // These sit waiting in queue because worker slots are occupied
    enqueueJob(
      {
        title: `[LOW PRIORITY 20] Background Routine Task #${iteration}`,
        type: 'simple',
        durationMs: 800,
        payload: { priorityTier: 'low', priorityValue: 20, iteration },
      },
      {
        priority: 20, // BullMQ: lower number = higher priority
      },
    );
    sleep(0.05); // Rapid submission
  } else {
    // Next 10 jobs: CRITICAL Emergency Tasks (Priority 1)
    // Even though 20+ low priority jobs are ahead in line, these MUST jump the queue!
    sleep(0.5);
    enqueueJob(
      {
        title: `🚨 [HIGH PRIORITY 1] Urgent Critical Job #${iteration}`,
        type: 'simple',
        durationMs: 300,
        payload: { priorityTier: 'critical', priorityValue: 1, iteration },
      },
      {
        priority: 1, // Highest priority!
      },
    );
    sleep(0.1);
  }
}
