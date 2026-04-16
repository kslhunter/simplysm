import type { ServiceServer } from "../service-server";
import type { ServiceSocket } from "../transport/socket/service-socket";
import type { AuthTokenPayload } from "../auth/auth-token-payload";
import { createServiceContext, getServiceAuthPermissions } from "./define-service";

export async function executeServiceMethod(
  server: ServiceServer,
  def: {
    serviceName: string;
    methodName: string;
    params: unknown[];
    socket?: ServiceSocket;
    http?: { clientName: string; authTokenPayload?: AuthTokenPayload };
  },
): Promise<unknown> {
  // 서비스 정의 검색
  const serviceDef = server.options.services.find((item) => item.name === def.serviceName);

  if (serviceDef == null) {
    throw new Error(`서비스 [${def.serviceName}]를 찾을 수 없습니다.`);
  }

  // 요청 유효성 검증 (게이트키퍼)
  const clientName = def.socket?.clientName ?? def.http?.clientName;
  if (clientName != null) {
    if (clientName.includes("..") || clientName.includes("/") || clientName.includes("\\")) {
      throw new Error(`[보안] 유효하지 않은 클라이언트 이름: ${clientName}`);
    }
  }

  // 컨텍스트 생성
  const ctx = createServiceContext(server, def.socket, def.http);

  // 팩토리를 호출하여 메서드 객체 생성
  const methods = serviceDef.factory(ctx);

  // 메서드 검색
  const method = (methods as Record<string, unknown>)[def.methodName];
  if (typeof method !== "function") {
    throw new Error(`메서드 [${def.serviceName}.${def.methodName}]를 찾을 수 없습니다.`);
  }

  // 인증 확인
  const methodPerms = getServiceAuthPermissions(method);
  const requiredPerms = methodPerms ?? serviceDef.authPermissions;

  if (requiredPerms != null) {
    if (server.options.auth == null) {
      // auth 설정 누락 — 설정 오류
      throw new Error("auth 설정이 필요합니다. auth 서비스를 사용하려면 서버 옵션에 auth를 설정하세요.");
    }

    if (server.options.auth !== false) {
      // auth가 설정되어 있으면 인증 검사 수행
      const authTokenPayload = def.socket?.authTokenPayload ?? def.http?.authTokenPayload;

      if (authTokenPayload == null) {
        throw new Error("로그인이 필요합니다.");
      }

      if (requiredPerms.length > 0) {
        const hasPerm = requiredPerms.some((perm) => authTokenPayload.roles.includes(perm));
        if (!hasPerm) {
          throw new Error("권한이 부족합니다.");
        }
      }
    }
    // auth === false → 의도적 비활성화, 인증 스킵
  }

  // 실행
  return await method(...def.params);
}
