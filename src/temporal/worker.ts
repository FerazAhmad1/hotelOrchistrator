import { Worker } from "@temporalio/worker";
import * as activities from "../activities/hotel.activities";

async function run() {
  const worker = await Worker.create({
    workflowsPath: require.resolve("../workflows/hotel.workflow"),
    activities,
    taskQueue: "hotel-task-queue",
  });

  await worker.run();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
