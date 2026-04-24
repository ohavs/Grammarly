import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyJwt from "@fastify/jwt";
import fp from "fastify-plugin";
import { config } from "../config.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

async function plugin(app: FastifyInstance) {
  await app.register(fastifyJwt, { secret: config.jwtSecret });

  app.decorate(
    "authenticate",
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        await req.jwtVerify();
      } catch {
        reply.code(401).send({ error: "unauthorized" });
      }
    },
  );
}

export const authPlugin = fp(plugin, { name: "auth" });
