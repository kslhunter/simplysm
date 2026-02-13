import type { ServiceServer } from "../service-server";
import type { ServiceSocket } from "../transport/socket/service-socket";
import type { AuthTokenPayload } from "../auth/auth-token-payload";
import { createServiceContext, getServiceAuthPermissions } from "./define-service";

export class ServiceExecutor {
  constructor(private readonly _server: ServiceServer) {}

  async runMethod(def: {
    serviceName: string;
    methodName: string;
    params: unknown[];
    socket?: ServiceSocket;
    http?: { clientName: string; authTokenPayload?: AuthTokenPayload };
  }): Promise<unknown> {
    // 서비스 정의 찾기
    const serviceDef = this._server.options.services.find((item) => item.name === def.serviceName);

    if (serviceDef == null) {
      throw new Error(`서비스[${def.serviceName}]를 찾을 수 없습니다.`);
    }

    // 요청 검증 (Gatekeeper)
    const clientName = def.socket?.clientName ?? def.http?.clientName;
    if (clientName != null) {
      if (clientName.includes("..") || clientName.includes("/") || clientName.includes("\\")) {
        throw new Error(`[Security] 유효하지 않은 클라이언트명입니다: ${clientName}`);
      }
    }

    // Context 생성
    const ctx = createServiceContext(this._server, def.socket, def.http);

    // Factory 호출하여 메서드 객체 생성
    const methods = serviceDef.factory(ctx);

    // 메서드 찾기
    const method = (methods as Record<string, unknown>)[def.methodName];
    if (typeof method !== "function") {
      throw new Error(`메소드[${def.serviceName}.${def.methodName}]를 찾을 수 없습니다.`);
    }

    // 인증 검사
    if (this._server.options.auth != null) {
      // 메서드 레벨 auth 먼저 확인, 없으면 서비스 레벨 확인
      const methodPerms = getServiceAuthPermissions(method);
      const requiredPerms = methodPerms ?? serviceDef.authPermissions;

      if (requiredPerms != null) {
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
    }

    // 실행
    return await method(...def.params);
  }
}
