import dotenv from "dotenv";

dotenv.config({
  path: "./src/.env",
});

export const config = {
  port: Number(process.env.PORT) || 8000,
  redisUrl: process.env.REDIS_URL!,
};
