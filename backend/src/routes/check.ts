import type { FastifyInstance } from "fastify";
import { checkText } from "../services/checker.js";
import { getSettings } from "../services/settings.js";
import { listDictionary } from "../services/dictionary.js";
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
      const authHeader = req.headers.authorization;
      let settings = undefined;
      let personal: string[] = [];
      if (authHeader) {
        try {
          const decoded = await app.jwt.verify<{ sub: string }>(
            authHeader.replace(/^Bearer\s+/i, ""),
          );
          settings = getSettings(decoded.sub);
          personal = listDictionary(decoded.sub);
        } catch {
          // unauthenticated checks fall back to defaults
        }
      }
      if (language) settings = { ...(settings ?? {}), language } as any;
      try {
        return await checkText(text, { settings, personal });
      } catch (err) {
        req.log.error(err);
        return reply.code(502).send({ error: "check_failed" });
      }
    },
  );
}
