import http from 'k6/http';
import { check } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3500';

export const JSON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

/**
 * Enqueue a customizable playground job
 */
export function enqueueJob(payload, options = {}) {
  const url = `${BASE_URL}/optimized-jobs/create`;
  const body = JSON.stringify({
    data: payload,
    options: options,
  });

  const res = http.post(url, body, { headers: JSON_HEADERS });

  check(res, {
    'job enqueued successfully (202)': (r) => r.status === 202,
    'has valid job ID': (r) => {
      try {
        const json = r.json();
        return json && json.success && json.jobId !== undefined;
      } catch {
        return false;
      }
    },
  });

  return res;
}

/**
 * Trigger quick-trigger sample jobs
 */
export function triggerSample(endpoint, payload = {}) {
  const url = `${BASE_URL}/optimized-jobs/sample/${endpoint}`;
  const res = http.post(url, JSON.stringify(payload), { headers: JSON_HEADERS });

  check(res, {
    'sample enqueued (202)': (r) => r.status === 202,
  });

  return res;
}

/**
 * Pause the optimized-jobs queue
 */
export function pauseQueue() {
  const url = `${BASE_URL}/optimized-jobs/queue/pause`;
  return http.post(url, null, { headers: JSON_HEADERS });
}

/**
 * Resume the optimized-jobs queue
 */
export function resumeQueue() {
  const url = `${BASE_URL}/optimized-jobs/queue/resume`;
  return http.post(url, null, { headers: JSON_HEADERS });
}

/**
 * Fetch current queue metrics from the controller
 */
export function getQueueMetrics() {
  const url = `${BASE_URL}/optimized-jobs/metrics`;
  return http.get(url, { headers: JSON_HEADERS });
}

/**
 * Dynamically adjust worker concurrency at runtime
 */
export function setConcurrency(concurrency) {
  const url = `${BASE_URL}/optimized-jobs/concurrency`;
  return http.post(url, JSON.stringify({ concurrency }), { headers: JSON_HEADERS });
}

/**
 * Get current worker concurrency
 */
export function getConcurrency() {
  const url = `${BASE_URL}/optimized-jobs/concurrency`;
  return http.get(url, { headers: JSON_HEADERS });
}
