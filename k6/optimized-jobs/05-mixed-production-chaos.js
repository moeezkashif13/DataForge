import { sleep } from "k6";
import { enqueueJob, triggerSample } from "./common.js";

export const options = {
  scenarios: {
    production_chaos_simulation: {
      executor: "ramping-vus",
      startVUs: 2,
      stages: [
        { duration: "15s", target: 8 }, // Warm up
        { duration: "45s", target: 12 }, // Full mixed load
        { duration: "20s", target: 4 }, // Cool down
        { duration: "10s", target: 0 },
      ],
    },
  },
};

export default function () {
  const rand = Math.random();
  const iter = __ITER;
  const vu = __VU;

  if (rand < 0.6) {
    // 60% - Fast simple jobs (Steady baseline)
    enqueueJob({
      title: `Production Simple Task [VU ${vu} - #${iter}]`,
      type: "simple",
      durationMs: 250 + Math.floor(Math.random() * 300),
      payload: { route: "fast-track", iter },
    });
  } else if (rand < 0.8) {
    // 20% - Multi-step progress jobs
    enqueueJob({
      title: `ETL Transform Step [VU ${vu} - #${iter}]`,
      type: "progress",
      steps: 4,
      durationMs: 350,
      payload: { pipeline: "stream-transform", iter },
    });
  } else if (rand < 0.9) {
    // 10% - Transient / Failing jobs with retries
    enqueueJob(
      {
        title: `Intermittent Service Call [VU ${vu} - #${iter}]`,
        type: "failing",
        failPermanently: Math.random() < 0.5,
        failUntilAttempt: 2,
        errorMessage: "Simulated 502 Bad Gateway from downstream partner",
        payload: { simulatedFailure: true, iter },
      },
      {
        attempts: 2,
        backoff: { type: "fixed", delay: 1000 },
      },
    );
  } else if (rand < 0.95) {
    // 5% - Heavy CPU prime compute (Stress testing event loop)
    enqueueJob({
      title: `Cryptographic Hash Simulation [VU ${vu} - #${iter}]`,
      type: "heavy-compute",
      steps: 3,
      payload: { cpuStress: true, iter },
    });
  } else {
    // 5% - Bulk burst submission
    triggerSample("bulk", { count: 4 });
  }

  // Realistic human/producer think time
  sleep(0.3 + Math.random() * 0.4);
}
