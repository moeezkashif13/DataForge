import { sleep } from 'k6';
import { enqueueJob } from './common.js';

// Configurable load profile via environment variables or default multi-stage stress profile
const VUS = __ENV.VUS ? parseInt(__ENV.VUS, 10) : null;
const DURATION = __ENV.DURATION || '60s';

export const options = VUS
  ? {
      scenarios: {
        failing_and_retries: {
          executor: 'constant-vus',
          vus: VUS,
          duration: DURATION,
        },
      },
      thresholds: {
        http_req_failed: ['rate<0.05'], // API enqueuing should not fail even under queue stress
        http_req_duration: ['p(95)<300'], // 95% of job submissions within 300ms
      },
    }
  : {
      scenarios: {
        failing_and_retries_storm: {
          executor: 'ramping-vus',
          startVUs: 2,
          stages: [
            { duration: '10s', target: 8 },  // Phase 1: Warmup & baseline failure rate
            { duration: '25s', target: 20 }, // Phase 2: Downstream Outage Surge (massive job failure influx)
            { duration: '30s', target: 25 }, // Phase 3: Secondary Shockwave (retried jobs wake up while new failures arrive)
            { duration: '15s', target: 5 },  // Phase 4: Cool down & observation of queue draining
            { duration: '5s', target: 0 },
          ],
        },
      },
      thresholds: {
        http_req_failed: ['rate<0.05'],
        http_req_duration: ['p(95)<350'],
      },
    };

/**
 * Real-world production failure profiles:
 * 1. Transient 503 / Rate-Limit: Recovers on attempt 3 (Tests Exponential Backoff)
 * 2. Database Connection Timeout: Recovers on attempt 2 (Tests Fixed Backoff / Thundering Herd)
 * 3. Poison Pill / Schema Invalidation: Fatal error, 1 attempt (Tests Dead-Letter / Failed Queue growth)
 * 4. Downstream Hard Outage: Retries 3 times and still fails (Tests Complete Retry Exhaustion)
 */
const ERROR_PROFILES = [
  {
    category: 'transient_rate_limit',
    title: 'Downstream HTTP 429/503 Rate Limit',
    error: 'HTTP 503: Service Unavailable - Downstream partner rate limit reached',
    failPermanently: false,
    failUntilAttempt: 3, // Succeeds on attempt 3
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // 1s, 2s, 4s exponential backoff curve
    },
  },
  {
    category: 'database_timeout_blip',
    title: 'PostgreSQL Connection Timeout',
    error: 'PostgresClientError: Connection pool timeout after 5000ms (ETIMEDOUT)',
    failPermanently: false,
    failUntilAttempt: 2, // Succeeds on attempt 2
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 2000, // 2s fixed delay (tests synchronized thundering herd wakeup)
    },
  },
  {
    category: 'poison_pill_schema',
    title: 'Invalid Foreign Key Constraint (Fatal Poison Pill)',
    error: 'SequelizeForeignKeyConstraintError: violates foreign key constraint on table "orders"',
    failPermanently: true, // Fatal, unrecoverable
    attempts: 1, // Non-retryable
    backoff: null,
  },
  {
    category: 'downstream_hard_outage',
    title: 'Payment Gateway Connection Refused (Exhaustion)',
    error: 'FetchError: connect ECONNREFUSED 10.0.4.15:443 - Service Completely Unreachable',
    failPermanently: true,
    failUntilAttempt: 99, // Will never succeed
    attempts: 3, // Retries 2 times, then lands in Failed state
    backoff: {
      type: 'exponential',
      delay: 1500,
    },
  },
];

export default function () {
  const iteration = __ITER;
  const vu = __VU;
  const profileIndex = (iteration + vu) % ERROR_PROFILES.length;
  const profile = ERROR_PROFILES[profileIndex];

  const jobPayload = {
    title: `[${profile.category}] VU ${vu} - #${iteration}: ${profile.title}`,
    type: 'failing',
    failPermanently: profile.failPermanently,
    failUntilAttempt: profile.failUntilAttempt,
    errorMessage: profile.error,
    payload: {
      category: profile.category,
      simulatedIssue: profile.title,
      vu,
      iteration,
      submittedAt: new Date().toISOString(),
    },
  };

  const jobOptions = {
    attempts: profile.attempts,
  };

  if (profile.backoff) {
    jobOptions.backoff = profile.backoff;
  }

  // Enqueue job via HTTP POST /optimized-jobs/create
  enqueueJob(jobPayload, jobOptions);

  // High-throughput think time: ~0.15s - 0.3s (Yields 60-120+ jobs/sec across 20-25 VUs)
  const sleepTime = __ENV.SLEEP ? parseFloat(__ENV.SLEEP) : 0.15 + Math.random() * 0.15;
  sleep(sleepTime);
}

