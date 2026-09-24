import { sleep } from 'k6';
import { enqueueJob } from './common.js';

export const options = {
  scenarios: {
    deduplication_stress: {
      executor: 'shared-iterations',
      vus: 5,
      iterations: 30, // 30 rapid requests sharing only 5 unique IDs
      maxDuration: '20s',
    },
  },
};

// Fixed pool of 5 business keys (e.g., entity IDs that shouldn't be processed twice simultaneously)
const IDEMPOTENT_KEYS = [
  'customer-invoice-sync-1001',
  'customer-invoice-sync-1002',
  'customer-invoice-sync-1003',
  'customer-invoice-sync-1004',
  'customer-invoice-sync-1005',
];

export default function () {
  const iter = __ITER;
  const key = IDEMPOTENT_KEYS[iter % IDEMPOTENT_KEYS.length];

  // Pass an explicit jobId in BullMQ options.
  // If a job with this ID is already waiting or active, BullMQ guarantees deduplication!
  enqueueJob(
    {
      title: `Idempotent Sync Task for [${key}] (Attempt #${iter})`,
      type: 'simple',
      durationMs: 800,
      payload: {
        idempotencyKey: key,
        requestAttempt: iter,
        submittedAt: new Date().toISOString(),
      },
    },
    {
      jobId: key, // 👈 BullMQ native deduplication key
    },
  );

  sleep(0.1);
}
