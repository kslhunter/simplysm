import { jsonParse } from "@simplysm/core-common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyJwt } from "../../auth/jwt-manager";
import type { AuthTokenPayload } from "../../auth/auth-token-payload";

export async function handleHttpRequest<TAuthInfo = unknown>(
  req: FastifyRequest,
  reply: FastifyReply,
  jwtSecret: string | undefined,
  runMethod: (def: {
    serviceName: string;
    methodName: string;
    params: unknown[];
    http: { clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> };
  }) => Promise<unknown>,
): Promise<void> {
  const { service, method } = req.params as { service: string; method: string };

  // ClientName header
  const clientName = req.headers["x-sd-client-name"] as string | undefined;
  if (clientName == null) throw new Error("ClientName header is required");

  // Parse and verify Authorization header
  let authTokenPayload: AuthTokenPayload<TAuthInfo> | undefined;
  try {
    const authHeader = req.headers.authorization;
    if (authHeader != null) {
      if (jwtSecret == null) throw new Error("JWT Secret이 정의되지 않았습니다.");

      const token = authHeader.split(" ")[1]; // "Bearer <token>"
      authTokenPayload = await verifyJwt<TAuthInfo>(jwtSecret, token);
    }
  } catch (err) {
    reply.status(401).send({
      error: "Unauthorized",
      message: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  // Parse parameters
  let params: unknown[] | undefined;
  if (req.method === "GET") {
    const query = req.query as { json?: string };
    if (typeof query.json !== "string") {
      throw new Error("JSON query parameter required");
    }
    params = jsonParse(query.json);
  } else if (req.method === "POST") {
    if (!Array.isArray(req.body)) {
      reply.status(400).send({
        error: "Bad Request",
        message: "Request body must be an array.",
      });
      return;
    }

    params = req.body as unknown[];
  }

  // Execute service and send response
  if (params != null) {
    const serviceResult = await runMethod({
      serviceName: service,
      methodName: method,
      params,
      http: { clientName, authTokenPayload },
    });

    reply.send(serviceResult);
  }
}
