import { sleep } from 'k6';
import { enqueueJob } from './common.js';

export const options = {
  scenarios: {
    sustained_overload_soak: {
      executor: 'constant-vus',
      vus: 8,          // 8 continuous producers
      duration: '90s', // 90 seconds sustained soak
    },
  },
};

export default function () {
  const iter = __ITER;
  const vu = __VU;

  // Influx rate is kept deliberately higher than worker capacity (~6 jobs/sec max across 3 slots)
  // Each job takes ~500ms, creating a constant net surplus of waiting jobs
  enqueueJob({
    title: `Sustained Overload Task [VU ${vu} - #${iter}]`,
    type: 'simple',
    durationMs: 500,
    payload: {
      soakRun: true,
      vu,
      iter,
      submittedAt: new Date().toISOString(),
    },
  });

  // Short pause: 8 VUs * 1 req every 0.35s = ~23 jobs/sec incoming rate!
  sleep(0.35);
}
