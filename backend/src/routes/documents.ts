import type { FastifyInstance } from "fastify";
import {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
} from "../services/documents.js";

export async function documentRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  function userId(req: { user: { sub: string } }) {
    return req.user.sub;
  }

  app.get("/documents", async (req) => ({
    documents: listDocuments(userId(req as any)),
  }));

  app.get<{ Params: { id: string } }>(
    "/documents/:id",
    async (req, reply) => {
      const doc = getDocument(userId(req as any), req.params.id);
      if (!doc) return reply.code(404).send({ error: "not_found" });
      return { document: doc };
    },
  );

  app.post<{ Body: { title?: string; content?: string } }>(
    "/documents",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            title: { type: "string", maxLength: 200 },
            content: { type: "string", maxLength: 500_000 },
          },
        },
      },
    },
    async (req) => ({
      document: createDocument(
        userId(req as any),
        req.body.title ?? "",
        req.body.content ?? "",
      ),
    }),
  );

  app.patch<{
    Params: { id: string };
    Body: { title?: string; content?: string };
  }>(
    "/documents/:id",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            title: { type: "string", maxLength: 200 },
            content: { type: "string", maxLength: 500_000 },
          },
        },
      },
    },
    async (req, reply) => {
      const doc = updateDocument(userId(req as any), req.params.id, req.body);
      if (!doc) return reply.code(404).send({ error: "not_found" });
      return { document: doc };
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/documents/:id",
    async (req, reply) => {
      const ok = deleteDocument(userId(req as any), req.params.id);
      if (!ok) return reply.code(404).send({ error: "not_found" });
      return { ok: true };
    },
  );
}
