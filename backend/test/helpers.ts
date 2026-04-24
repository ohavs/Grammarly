import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.DATABASE_PATH = join(
  mkdtempSync(join(tmpdir(), "writeright-test-")),
  "test.db",
);
process.env.JWT_SECRET = "test-secret";
process.env.LOG_LEVEL = "silent";

export async function buildApp() {
  const [{ default: Fastify }, cors, authPluginMod, routes] = await Promise.all(
    [
      import("fastify"),
      import("@fastify/cors"),
      import("../src/plugins/auth.js"),
      Promise.all([
        import("../src/routes/health.js"),
        import("../src/routes/check.js"),
        import("../src/routes/stats.js"),
        import("../src/routes/tone.js"),
        import("../src/routes/auth.js"),
        import("../src/routes/documents.js"),
        import("../src/routes/settings.js"),
        import("../src/routes/synonyms.js"),
      ]),
    ],
  );

  const app = Fastify({ logger: false });
  await app.register(cors.default, { origin: true });
  await app.register(authPluginMod.authPlugin);
  for (const r of routes) {
    const fn = Object.values(r)[0] as any;
    await app.register(fn, { prefix: "/api" });
  }
  await app.ready();
  return app;
}
