import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "../activities/hotel.activities";
import { config } from "../config/env";

async function run() {
  const connection = await NativeConnection.connect({
    address: config.temporalAddress,
  });

  const worker = await Worker.create({
    connection,
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
