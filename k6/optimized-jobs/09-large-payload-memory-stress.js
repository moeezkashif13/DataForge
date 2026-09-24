import { sleep } from 'k6';
import { enqueueJob } from './common.js';

export const options = {
  scenarios: {
    memory_payload_stress: {
      executor: 'constant-vus',
      vus: 2,
      duration: '35s',
    },
  },
};

// Generates a mock dataset chunk of approximately requested size in KB
function generateMockRowBatch(targetKb) {
  const sampleRow = {
    id: 1,
    uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    email: 'migration.record.user@enterprise-corp.dataforge.io',
    first_name: 'Alexander',
    last_name: 'Montgomery-Smith',
    metadata: {
      department: 'Distributed Systems & Database Reliability Engineering',
      tags: ['etl', 'migration', 'batch-insert', 'high-throughput', 'streaming'],
      attributes: {
        created_at: '2026-09-23T00:00:00.000Z',
        flagged: false,
        score: 99.85,
        notes: 'Simulated high-volume customer data payload for migration stress testing.',
      },
    },
  };

  // Rough estimation: each sample row serialized is ~400 bytes
  const rowCount = Math.ceil((targetKb * 1024) / 400);
  const rows = new Array(rowCount);
  for (let i = 0; i < rowCount; i++) {
    rows[i] = { ...sampleRow, id: i + 1 };
  }
  return rows;
}

export default function () {
  const iter = __ITER;
  const sizesKb = [250, 500, 1000, 1500]; // 250KB, 500KB, 1MB, 1.5MB
  const targetKb = sizesKb[iter % sizesKb.length];

  const payloadData = generateMockRowBatch(targetKb);

  enqueueJob({
    title: `Heavy Payload Job #${iter} (~${targetKb} KB chunk)`,
    type: 'custom',
    durationMs: 400,
    payload: {
      batchId: `batch-mem-${Date.now()}`,
      sizeKb: targetKb,
      recordsCount: payloadData.length,
      records: payloadData,
    },
  });

  // Space out large allocations to watch V8 GC cycles in Grafana
  sleep(1.2);
}
