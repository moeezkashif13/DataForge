# DataForge Scalability & Load Testing Suite (k6)

This folder contains a complete suite of load testing scripts designed to benchmark, stress-test, and find the capacity limits of the DataForge backend.

---

## 📁 Files in This Directory

* **`smoke-test.js`**: Quick 15-second sanity check (5 users) to ensure all endpoints return `200 OK`.
* **`single-migration-test.js`**: Micro-benchmark targeting `GET /migrations` with a ramp-up from 50 to 200 users.
* **`full-backend-test.js`**: The flagship **Full User Journey** test simulating realistic human traffic across Auth, Projects, Migrations, and Creation endpoints up to 500 concurrent users.

---

## 🚀 Prerequisites: Installing k6 on Windows

If you haven't installed `k6` yet, open Windows Terminal (PowerShell) and run:

```powershell
winget install k6 --source winget
```

To verify installation:
```powershell
k6 version
```

---

## 🛠️ How to Run the Tests

Make sure your backend is running (`pm2` or `npm run start:dev`) before running these tests.

### 1. Run the Quick Smoke Test (15 Seconds)
Always run this first to ensure your token is valid and all routes respond:
```powershell
k6 run k6/smoke-test.js
```

### 2. Run the Full Backend User Journey with Live Web Dashboard
To watch interactive charts of RPS, p95 latency, and active users live in your web browser:
```powershell
k6 run --web-dashboard k6/full-backend-test.js
```
👉 Open **`http://localhost:5665`** in your browser to watch the real-time graphs!

### 3. How to Pass a Custom Token or Base URL
By default, the scripts use your current development token. If you log in with a new user, you can pass the new token via `-e`:
```powershell
k6 run -e TOKEN="your_new_token_here" --web-dashboard k6/full-backend-test.js
```

To test a deployed cloud server instead of localhost:
```powershell
k6 run -e BASE_URL="https://api.yourdomain.com" -e TOKEN="your_token" --web-dashboard k6/full-backend-test.js
```

---

## 📊 How to Judge the Scorecard Output

At the end of each test, k6 prints a scorecard. Here is how to evaluate it:

| Metric | Ideal Target | What it Means |
| :--- | :--- | :--- |
| **`http_req_failed`** | **0.00%** (strictly < 1%) | Percentage of dropped requests or 500 errors. |
| **`http_req_duration p(95)`** | **< 1,000 ms** (Ideal: 200–500ms) | 95 out of 100 users experienced sub-second response times. |
| **`checks`** | **100% ✓** | Every status code assertion passed. |

### Finding the Server's Breaking Point:
In the web dashboard at `http://localhost:5665`:
* Look at the user count line (blue) vs the latency line (green).
* The moment the green latency line sharply hooks upward, check the number of virtual users at that exact minute. **That is your server's certified maximum concurrent user capacity!**
