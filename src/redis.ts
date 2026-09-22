import { config } from "./config/env";
import Redis from "ioredis";

export const redis = new Redis(config.redisUrl);

redis.on("connect", () => {
  console.log("Redis connected");
});

redis.on("error", (error) => {
  console.error("Redis error:", error);
});
