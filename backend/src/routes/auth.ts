import type { FastifyInstance } from "fastify";
import { register, login, getUser, AuthError } from "../services/auth.js";

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: { email: string; name: string; password: string } }>(
    "/auth/register",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "name", "password"],
          properties: {
            email: { type: "string", format: "email", maxLength: 200 },
            name: { type: "string", minLength: 1, maxLength: 80 },
            password: { type: "string", minLength: 8, maxLength: 200 },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const user = await register(
          req.body.email,
          req.body.name,
          req.body.password,
        );
        const token = app.jwt.sign({ sub: user.id });
        return { user, token };
      } catch (err) {
        if (err instanceof AuthError)
          return reply.code(err.status).send({ error: err.message });
        throw err;
      }
    },
  );

  app.post<{ Body: { email: string; password: string } }>(
    "/auth/login",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", maxLength: 200 },
            password: { type: "string", maxLength: 200 },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const user = await login(req.body.email, req.body.password);
        const token = app.jwt.sign({ sub: user.id });
        return { user, token };
      } catch (err) {
        if (err instanceof AuthError)
          return reply.code(err.status).send({ error: err.message });
        throw err;
      }
    },
  );

  app.get(
    "/auth/me",
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const userId = (req.user as { sub: string }).sub;
      const user = getUser(userId);
      if (!user) return reply.code(404).send({ error: "User not found" });
      return { user };
    },
  );
}
