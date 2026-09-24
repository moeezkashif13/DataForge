import { sleep } from 'k6';
import { enqueueJob } from './common.js';

export const options = {
  scenarios: {
    delayed_jobs_simulation: {
      executor: 'shared-iterations',
      vus: 3,
      iterations: 30,
      maxDuration: '45s',
    },
  },
};

export default function () {
  const iteration = __ITER;
  const delayTiers = [
    { delayMs: 4000, label: '4s Delay' },
    { delayMs: 8000, label: '8s Delay' },
    { delayMs: 12000, label: '12s Delay' },
    { delayMs: 16000, label: '16s Thundering Herd Batch' },
  ];

  const tier = delayTiers[iteration % delayTiers.length];

  enqueueJob(
    {
      title: `Scheduled Job #${iteration} [${tier.label}]`,
      type: 'delayed',
      durationMs: 400,
      payload: {
        scheduledDelayMs: tier.delayMs,
        scheduledAt: new Date().toISOString(),
        iteration,
      },
    },
    {
      delay: tier.delayMs, // BullMQ delay in milliseconds
    },
  );

  sleep(0.2);
}
