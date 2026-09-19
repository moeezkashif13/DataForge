import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.TOKEN || 'arnqR1haNtAgp5vQAZzw4GuyBDeBSZuk';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '1m', target: 200 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  };

  const res = http.get(`${BASE_URL}/migrations`, { headers });
  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(0.1);
}
