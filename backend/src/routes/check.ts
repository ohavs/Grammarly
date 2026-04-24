import type { FastifyInstance } from "fastify";
import { checkText } from "../services/checker.js";
import type { CheckRequest } from "@writeright/shared";

export async function checkRoutes(app: FastifyInstance) {
  app.post<{ Body: CheckRequest }>(
    "/check",
    {
      schema: {
        body: {
          type: "object",
          required: ["text"],
          properties: {
            text: { type: "string", maxLength: 50_000 },
            language: { type: "string" },
          },
        },
      },
    },
    async (req, reply) => {
      const { text, language } = req.body;
      try {
        return await checkText(text, language);
      } catch (err) {
        req.log.error(err);
        return reply.code(502).send({ error: "check_failed" });
      }
    },
  );
}
