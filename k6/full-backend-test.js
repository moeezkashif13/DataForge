import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

// Dedicated latency tracking per endpoint (printed in CLI summary)
const migrationsTrend = new Trend('duration_get_migrations');
const projectsTrend = new Trend('duration_get_projects');
const sessionTrend = new Trend('duration_get_session');
const createTrend = new Trend('duration_post_create');

// ---------------------------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
// Default token used in your recent tests (override via: k6 run -e TOKEN="your_token" ...)
const TOKEN = __ENV.TOKEN || 'gqAkPlvSttfBcG3hgeRtBMH5lBJAm7co';

export const options = {
  // RAMP-UP SCHEDULE: Staircase test to discover server breaking point
  stages: [
    // { duration: '30s', target: 50 },  // 1. Warm-up to 50 users
    { duration: '30s', target: 50 },
    { duration: '30s', target: 100 },
    // { duration: '30s', target: 150 },
    // { duration: '30s', target: 50
    // { duration: '1m', target: 150 },  // 2. Normal peak traffic (150 users)
    // { duration: '1m', target: 300 },  // 3. Heavy load (300 users)
    // { duration: '1m', target: 500 },  // 4. Maximum stress test (500 users!)
    // { duration: '30s', target: 0 },   // 5. Ramp-down to 0 (cool down)
    { duration: '30s', target: 50 },   // 5. Ramp-down to 0 (cool down)
    { duration: '30s', target: 0 },   // 5. Ramp-down to 0 (cool down)

  ],

  // PASS / FAIL CRITERIA (Service Level Objectives)
  thresholds: {
    // 95% of requests must complete under 1,000ms (1 second)
    http_req_duration: ['p(95)<1000'],
    // Less than 1% of requests are allowed to fail
    http_req_failed: ['rate<0.01'],
  },
};

// ---------------------------------------------------------------------------
// SETUP: Auto-discover an active projectId from user's account
// ---------------------------------------------------------------------------
export function setup() {
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  };

  const res = http.get(`${BASE_URL}/organization/projects`, { headers });
  let discoveredProjectId = null;

  if (res.status === 200) {
    try {
      const data = JSON.parse(res.body);
      const projects = Array.isArray(data) ? data : data?.projects || [];
      if (projects.length > 0) {
        discoveredProjectId = projects[0].id;
        console.log(`[k6 setup] Auto-discovered active project ID: ${discoveredProjectId}`);
      }
    } catch {
      // Ignored: fallback below
    }
  }

  if (!discoveredProjectId) {
    console.warn('[k6 setup] No existing projects discovered. Write tests will simulate creation with dummy ID.');
  }

  return {
    projectId: discoveredProjectId,
  };
}

// ---------------------------------------------------------------------------
// VIRTUAL USER EXECUTION (Simulating Realistic Human User Journeys)
// ---------------------------------------------------------------------------
export default function (data) {
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip',
  };

  // Roll a probability between 0.00 and 1.00 to model real traffic behavior
  const rand = Math.random();

  if (rand < 0.50) {
    // 50% of traffic: Viewing migrations list (Read Heavy)
    const res = http.get(`${BASE_URL}/migrations`, {
      headers,
      tags: { name: 'GET /migrations' },
    });
    migrationsTrend.add(res.timings.duration);
    check(res, {
      'get migrations: status 200': (r) => r.status === 200,
    });

  } else if (rand < 0.75) {
    // 25% of traffic: Viewing organization projects (Read)
    const res = http.get(`${BASE_URL}/organization/projects`, {
      headers,
      tags: { name: 'GET /projects' },
    });
    projectsTrend.add(res.timings.duration);
    check(res, {
      'get projects: status 200': (r) => r.status === 200,
    });

  } else if (rand < 0.90) {
    // 15% of traffic: Session & auth verification (Auth)
    const res = http.get(`${BASE_URL}/api/auth/get-session`, {
      headers,
      tags: { name: 'GET /session' },
    });
    sessionTrend.add(res.timings.duration);
    check(res, {
      'get session: status 200': (r) => r.status === 200,
    });

  } else {
    // 10% of traffic: Creating a new migration (Database Write)
    const targetProjectId = data?.projectId || 'proj_benchmark_test';

    const payload = JSON.stringify({
      name: `Benchmark-Migration-${Date.now()}`,
      projectId: targetProjectId,
      source_type: 'csv',
      target_type: 'postgresql',
      target_database: 'dataforge',
      target_table: 'customers',
      source_file_path: 'customers.csv',
      mappings: [{ source_field: 'id', target_field: 'id' }],
    });

    const res = http.post(`${BASE_URL}/migrations/create`, payload, {
      headers,
      tags: { name: 'POST /migrations/create' },
    });
    createTrend.add(res.timings.duration);
    check(res, {
      'create migration: status 201': (r) => r.status === 201,
    });
  }

  // Realistic human "think-time" (User pauses for 1 to 2 seconds before clicking again)
  sleep(Math.random() * 1 + 1);
}
