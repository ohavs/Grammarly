import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { db } from "./db.js";
import { healthRoutes } from "./routes/health.js";
import { checkRoutes } from "./routes/check.js";
import { statsRoutes } from "./routes/stats.js";
import { toneRoutes } from "./routes/tone.js";
import { authRoutes } from "./routes/auth.js";
import { documentRoutes } from "./routes/documents.js";
import { settingsRoutes } from "./routes/settings.js";
import { synonymRoutes } from "./routes/synonyms.js";
import { authPlugin } from "./plugins/auth.js";

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? "info" },
});

await app.register(cors, { origin: true, credentials: true });
await app.register(authPlugin);
await app.register(healthRoutes, { prefix: "/api" });
await app.register(authRoutes, { prefix: "/api" });
await app.register(documentRoutes, { prefix: "/api" });
await app.register(settingsRoutes, { prefix: "/api" });
await app.register(synonymRoutes, { prefix: "/api" });
await app.register(checkRoutes, { prefix: "/api" });
await app.register(statsRoutes, { prefix: "/api" });
await app.register(toneRoutes, { prefix: "/api" });

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
