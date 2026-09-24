# DataForge k6 Simulation Suite: `optimized-jobs` Queue

This suite provides automated k6 performance scenarios to simulate production workloads, backpressure, queue backlog spikes, retries, and errors against the BullMQ `optimized-jobs` queue.

---

## Prerequisites

1. **Execution Agent running:**
   ```bash
   cd execution-agent
   npm run start:dev # Running on port 3500
   ```
2. **Prometheus & Grafana running:**
   ```bash
   docker compose -f monitoring/docker-compose.monitoring.yml up -d
   ```
3. **Dashboards open:**
   * **Grafana Dashboard:** [http://localhost:3100/d/bullmq-overview/dataforge-bullmq-and-system-overview](http://localhost:3100/d/bullmq-overview/dataforge-bullmq-and-system-overview) (Login: `admin` / `admin`)
   * **Bull-Board Visualizer:** [http://localhost:3500/admin/queues](http://localhost:3500/admin/queues)

---

## Test Scenarios & How to Run

### 1. Steady-State Success Traffic
Simulates healthy, balanced production traffic with simple and multi-step progress jobs.
```bash
k6 run k6/optimized-jobs/01-steady-success.js
```
* **What to observe in Grafana:**
  * **Ingestion vs Draining Balance:** The *Producer Influx* line and *Consumer Drain* line closely mirror each other.
  * **Queue Wait Latency:** p50/p90 wait times remain low (< 500ms).
  * **Error & Failed Stat Cards:** Remain at 0.

---

### 2. Failing Jobs & Retries (Error Storm & Thundering Herd)
Simulates real-world production outages, cascading retry waves, exponential backoff curves, fixed backoff thundering herds, fatal poison pills, and full retry exhaustion.
```bash
# Run multi-stage error storm (ramps up to 25 VUs, generating 60-120+ jobs/sec)
k6 run k6/optimized-jobs/02-failing-and-retries.js

# Or run with custom constant load and duration:
k6 run -e VUS=30 -e DURATION=45s -e SLEEP=0.1 k6/optimized-jobs/02-failing-and-retries.js
```
* **What to observe in Grafana:**
  * **Failed Jobs (`bullmq_jobs_failed_total`):** Watch poison pill & exhausted jobs land permanently in failed state.
  * **Retry Activity (`bullmq_jobs_retried_total`):** Spikes as transient flapping jobs trigger backoff retries.
  * **Delayed vs Waiting Dynamics:** Watch delayed jobs accumulate in Redis ZSets and then simultaneously flood back into Waiting.
  * **Bull-Board Visualizer:** Inspect stack traces, attempt counters (`attemptsMade / attempts`), and error categories in the **Failed** & **Delayed** tabs.

---

### 3. Queue Backlog Spike (Burst & Surge)
Simulates a massive influx of producer jobs outstripping worker capacity. The script temporarily pauses the queue, floods it with 100+ jobs, and resumes it so workers drain the backlog.
```bash
k6 run k6/optimized-jobs/03-queue-backlog-spike.js
```
* **What to observe in Grafana:**
  * **Queue Backlog (Waiting):** Climbs into double/triple digits, turning yellow then red.
  * **Producer Influx vs Drain:** Influx dramatically outpaces Drain.
  * **Queue Wait Latency (Time-in-Queue):** p90 and p99 jump from milliseconds to several seconds.
  * **Once Resumed:** Consumer Drain hits maximum capacity (concurrency limit) until the backlog drains back to 0.

---

### 4. Backpressure & Heavy Compute (CPU Saturation)
Enqueues CPU-intensive prime-number factorization workloads (`heavy-compute`) to saturate worker threads and simulate event-loop resistance.
```bash
k6 run k6/optimized-jobs/04-backpressure-heavy-compute.js
```
* **What to observe in Grafana:**
  * **Event Loop Delay (ms):** p90/p99 lag climbs toward 50ms+.
  * **Process CPU Utilization:** Noticeable CPU spike.
  * **Active Jobs:** Stays locked at the worker concurrency maximum (e.g. 3 active).
  * **Execution Duration:** Execution duration histogram shows p90/p99 times extending.

---

### 5. Mixed Production Chaos (All-in-One Stress Test)
Simulates a realistic day in production with a heterogeneous mix of 60% simple, 20% progress, 10% failing/retrying, 5% heavy compute, and 5% bulk bursts.
```bash
k6 run k6/optimized-jobs/05-mixed-production-chaos.js
```
* **What to observe in Grafana:**
  * Exercises all 18 dashboard panels simultaneously: Throughput, Backlog, Latency percentiles, Worker capacity, Memory allocation, and CPU.

---

### 6. Job Priority & Queue Jumping
Enqueues 25 low-priority background tasks (`priority: 20`), followed by 10 critical emergency jobs (`priority: 1`).
```bash
k6 run k6/optimized-jobs/06-priority-queue-jumping.js
```
* **What to observe in Grafana & Bull-Board:**
  * High-priority jobs (Priority 1) jump ahead of low-priority tasks and complete first, despite 20+ jobs waiting ahead of them.

---

### 7. Scheduled Delayed Jobs & Thundering Herd
Enqueues staggered delayed jobs (4s, 8s, 12s, 16s) with a batch of jobs scheduled to wake up at the exact same millisecond.
```bash
k6 run k6/optimized-jobs/07-delayed-jobs-thundering-herd.js
```
* **What to observe in Grafana & Bull-Board:**
  * Watch the **Delayed** count in Bull-Board.
  * When the 16s timer fires, watch the sudden instant transfer from *Delayed* -> *Waiting* -> *Active*.

---

### 8. Job Deduplication & Idempotent Producers
Rapidly sends 30 enqueue requests sharing only 5 distinct `jobId` keys, simulating aggressive producer network retries.
```bash
k6 run k6/optimized-jobs/08-job-deduplication-idempotency.js
```
* **What to observe in Bull-Board:**
  * Only 5 unique jobs enter the queue in Redis; all 25 duplicate requests are deduplicated by BullMQ, preventing double execution.

---

### 9. Large Payload & Heap Memory Stress
Sends jobs carrying heavy 250KB, 500KB, 1MB, and 1.5MB serialized record batches to test Redis memory transfer and V8 heap limits.
```bash
k6 run k6/optimized-jobs/09-large-payload-memory-stress.js
```
* **What to observe in Grafana:**
  * **Memory Allocation (RSS vs Heap):** Watch V8 Heap Used and Resident Memory (RSS) rise.
  * V8 Garbage Collection cycles in action.

---

### 10. Sustained Overload & Queue Drift (Soak Test)
Generates a persistent 20+ jobs/sec influx rate exceeding the worker's ~6 jobs/sec capacity for 90 seconds.
```bash
k6 run k6/optimized-jobs/10-sustained-overload-soak.js
```
* **What to observe in Grafana:**
  * **Ingestion vs Draining Rate:** Producer Influx stays steadily ABOVE Consumer Drain throughout the entire run.
  * **Queue Backlog (Waiting):** Continuous linear 45-degree upward climb.
  * **Queue Wait Latency (Time-in-Queue):** Demonstrates Little's Law as wait latency steadily expands.

---

## Dynamic Concurrency Control (No Restarts Required)

BullMQ workers maintain worker concurrency inside the Node.js process memory. You can inspect or change the concurrency dynamically on the fly:

* **Get current worker concurrency:**
  ```bash
  curl http://localhost:3500/optimized-jobs/concurrency
  ```

* **Dynamically scale worker concurrency to 40 (drains backlogs instantly):**
  ```bash
  curl -X POST http://localhost:3500/optimized-jobs/concurrency \
    -H "Content-Type: application/json" \
    -d "{\"concurrency\": 40}"
  ```

* **Scale worker back down to 3:**
  ```bash
  curl -X POST http://localhost:3500/optimized-jobs/concurrency \
    -H "Content-Type: application/json" \
    -d "{\"concurrency\": 3}"
  ```

---

## Configuration Options

To run against a remote or custom host:
```bash
k6 run -e BASE_URL=http://my-server:3500 k6/optimized-jobs/01-steady-success.js
```

