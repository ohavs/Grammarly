import type { FastifyInstance } from "fastify";
import { getSettings, saveSettings } from "../services/settings.js";
import {
  addWord,
  listDictionary,
  removeWord,
} from "../services/dictionary.js";

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  function userId(req: { user: { sub: string } }) {
    return req.user.sub;
  }

  app.get("/settings", async (req) => ({
    settings: getSettings(userId(req as any)),
  }));

  app.put<{
    Body: {
      language?: string;
      audience?: string;
      formality?: string;
      intent?: string;
    };
  }>(
    "/settings",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            language: { type: "string", maxLength: 10 },
            audience: {
              type: "string",
              enum: ["general", "knowledgeable", "expert"],
            },
            formality: {
              type: "string",
              enum: ["informal", "neutral", "formal"],
            },
            intent: {
              type: "string",
              enum: ["inform", "describe", "convince", "tell-a-story"],
            },
          },
        },
      },
    },
    async (req) => ({
      settings: saveSettings(userId(req as any), req.body as any),
    }),
  );

  app.get("/dictionary", async (req) => ({
    words: listDictionary(userId(req as any)),
  }));

  app.post<{ Body: { word: string } }>(
    "/dictionary",
    {
      schema: {
        body: {
          type: "object",
          required: ["word"],
          properties: {
            word: { type: "string", minLength: 1, maxLength: 60 },
          },
        },
      },
    },
    async (req) => {
      addWord(userId(req as any), req.body.word);
      return { words: listDictionary(userId(req as any)) };
    },
  );

  app.delete<{ Params: { word: string } }>(
    "/dictionary/:word",
    async (req) => {
      removeWord(userId(req as any), decodeURIComponent(req.params.word));
      return { words: listDictionary(userId(req as any)) };
    },
  );
}
