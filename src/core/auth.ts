import { FastifyReply, FastifyRequest } from "fastify";
import { AuthContext, Role } from "./types";

declare module "fastify" {
  interface FastifyRequest {
    auth: AuthContext;
  }
}

export function attachAuth(req: FastifyRequest, _res: FastifyReply, done: () => void) {
  const userId = String(req.headers["x-user-id"] ?? "demo-user");
  const workspaceId = String(req.headers["x-workspace-id"] ?? "ws_demo");
  const role = (req.headers["x-role"] as Role) ?? "landlord_owner";
  req.auth = { userId, workspaceId, role };
  done();
}

export function ensureRole(allowed: Role[]) {
  return (req: FastifyRequest, res: FastifyReply, done: () => void) => {
    if (allowed.includes(req.auth.role)) return done();
    res.status(403).send({ error: "forbidden" });
  };
}
