import { json, err as errNs } from "@simplysm/core-common";
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

  // ClientName 헤더
  const clientName = req.headers["x-sd-client-name"] as string | undefined;
  if (clientName == null) throw new Error("ClientName 헤더가 필요합니다");

  // Authorization 헤더 파싱 및 검증
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
      error: "인증 실패",
      message: errNs.message(err),
    });
    return;
  }

  // 매개변수 파싱
  let params: unknown[] | undefined;
  if (req.method === "GET") {
    const query = req.query as { json?: string };
    if (typeof query.json !== "string") {
      throw new Error("JSON 쿼리 파라미터가 필요합니다");
    }
    params = json.parse(query.json);
  } else if (req.method === "POST") {
    if (!Array.isArray(req.body)) {
      reply.status(400).send({
        error: "잘못된 요청",
        message: "요청 본문은 배열이어야 합니다.",
      });
      return;
    }

    params = req.body as unknown[];
  } else {
    reply.status(405).send({
      error: "Method Not Allowed",
      message: `${req.method} 메서드는 지원하지 않습니다.`,
    });
    return;
  }

  // 서비스 실행 및 응답 전송
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
