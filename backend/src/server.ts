import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { db } from "./db.js";
import { healthRoutes } from "./routes/health.js";

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? "info" },
});

await app.register(cors, { origin: true, credentials: true });
await app.register(healthRoutes, { prefix: "/api" });

app.get("/", async () => ({ name: "WriteRight API", version: "0.0.1" }));

const start = async () => {
  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`DB: ${config.databasePath}`);
    app.log.info(`Tables: ${db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r: any) => r.name)
      .join(", ")}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
