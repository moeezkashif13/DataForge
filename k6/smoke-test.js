import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.TOKEN || 'arnqR1haNtAgp5vQAZzw4GuyBDeBSZuk';

export const options = {
  vus: 5,           // Only 5 virtual users
  duration: '15s',  // Quick 15-second verification
};

export default function () {
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  };

  // 1. Check migrations endpoint
  const resMigrations = http.get(`${BASE_URL}/migrations`, { headers });
  check(resMigrations, {
    'migrations returns 200': (r) => r.status === 200,
  });

  // 2. Check projects endpoint
  const resProjects = http.get(`${BASE_URL}/organization/projects`, { headers });
  check(resProjects, {
    'projects returns 200': (r) => r.status === 200,
  });

  // 3. Check session endpoint
  const resSession = http.get(`${BASE_URL}/api/auth/get-session`, { headers });
  check(resSession, {
    'session returns 200': (r) => r.status === 200,
  });

  sleep(1);
}
