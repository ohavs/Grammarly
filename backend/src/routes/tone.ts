import type { FastifyInstance } from "fastify";
import { analyzeTone } from "../services/tone.js";

export async function toneRoutes(app: FastifyInstance) {
  app.post<{ Body: { text: string } }>(
    "/tone",
    {
      schema: {
        body: {
          type: "object",
          required: ["text"],
          properties: { text: { type: "string", maxLength: 200_000 } },
        },
      },
    },
    async (req) => analyzeTone(req.body.text),
  );
}
