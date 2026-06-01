import { FastifyRequest } from "fastify";

export function assertWorkspace(req: FastifyRequest, workspaceId: string) {
  if (req.auth.role !== "platform_admin" && req.auth.workspaceId !== workspaceId) {
    throw new Error("cross_workspace_forbidden");
  }
}
