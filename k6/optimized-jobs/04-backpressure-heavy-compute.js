import { sleep } from 'k6';
import { enqueueJob } from './common.js';

export const options = {
  scenarios: {
    backpressure_heavy_compute: {
      executor: 'constant-vus',
      vus: 4,          // 4 concurrent producers
      duration: '45s', // Run for 45s of compute pressure
    },
  },
};

export default function () {
  const iteration = __ITER;
  const vu = __VU;

  // Enqueue CPU-heavy prime number computation job
  enqueueJob({
    title: `Heavy Compute Job [VU ${vu} - #${iteration}]`,
    type: 'heavy-compute',
    steps: 6, // 6 rounds of prime number factorization
    payload: {
      workload: 'prime-number-sieve',
      rounds: 6,
      iterationsPerRound: 250000,
      startedAt: new Date().toISOString(),
    },
  });

  // Space out compute job generation so the queue stays continuously saturated
  sleep(1.5);
}
