import { sleep } from "k6";
import { enqueueJob } from "./common.js";

export const options = {
  scenarios: {
    steady_success_traffic: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "15s", target: 15 }, // Ramp up to 5 concurrent producers
        { duration: "30s", target: 15 }, // Steady throughput
        { duration: "30s", target: 30 }, // Steady throughput
        { duration: "15s", target: 15 }, // Ramp down
        { duration: "15s", target: 0 }, // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"], // Less than 1% HTTP failures
    http_req_duration: ["p(95)<500"], // 95% of API enqueue requests < 500ms
  },
};

export default function () {
  const iteration = __ITER;
  const isProgressJob = iteration % 3 === 0;

  if (isProgressJob) {
    // Multi-step progress job
    enqueueJob({
      title: `Successful Progress Job #${iteration}`,
      type: "progress",
      steps: 4,
      durationMs: 400, // 400ms per step
      payload: {
        scenario: "steady_success",
        iteration,
        timestamp: new Date().toISOString(),
      },
    });
  } else {
    // Fast simple job
    enqueueJob({
      title: `Successful Simple Job #${iteration}`,
      type: "simple",
      durationMs: 300,
      payload: {
        scenario: "steady_success",
        iteration,
        status: "OK",
      },
    });
  }

  // Pace out requests slightly (300ms - 600ms) to maintain smooth ingestion
  sleep(0.4);
}
