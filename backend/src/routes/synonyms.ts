import type { FastifyInstance } from "fastify";
import { lookupSynonyms } from "../services/synonyms.js";

export async function synonymRoutes(app: FastifyInstance) {
  app.get<{ Params: { word: string } }>(
    "/synonyms/:word",
    async (req) => {
      const word = decodeURIComponent(req.params.word);
      return { word, synonyms: lookupSynonyms(word) };
    },
  );
}
