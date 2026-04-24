import type { FastifyInstance } from "fastify";
import { computeStats } from "../services/stats.js";

export async function statsRoutes(app: FastifyInstance) {
  app.post<{ Body: { text: string } }>(
    "/stats",
    {
      schema: {
        body: {
          type: "object",
          required: ["text"],
          properties: { text: { type: "string", maxLength: 200_000 } },
        },
      },
    },
    async (req) => computeStats(req.body.text),
  );
}
