import { Connection, Client } from "@temporalio/client";
import { config } from "../config/env";

let client: Client | null = null;

export async function getTemporalClient() {
  if (client) {
    return client;
  }

  const connection = await Connection.connect({
    address: config.temporalAddress,
  });

  client = new Client({
    connection,
  });

  return client;
}
