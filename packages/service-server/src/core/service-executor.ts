import type { ServiceServer } from "../service-server";
import type { ServiceSocket } from "../transport/socket/service-socket";
import type { AuthTokenPayload } from "../auth/auth-token-payload";
import { getAuthPermissions } from "../auth/auth.decorators";

export class ServiceExecutor {
  constructor(private readonly _server: ServiceServer) {}

  async runMethod(def: {
    serviceName: string;
    methodName: string;
    params: unknown[];
    socket?: ServiceSocket;
    http?: { clientName: string; authTokenPayload?: AuthTokenPayload };
  }): Promise<unknown> {
    // 서비스 클래스 찾기
    const ServiceClass = this._server.options.services.find(
      (item) => item.name === def.serviceName,
    );

    if (ServiceClass == null) {
      throw new Error(`서비스[${def.serviceName}]를 찾을 수 없습니다.`);
    }

    // 요청 검증 (Gatekeeper)
    const clientName = def.socket?.clientName ?? def.http?.clientName;
    if (clientName != null) {
      if (clientName.includes("..") || clientName.includes("/") || clientName.includes("\\")) {
        throw new Error(`[Security] 유효하지 않은 클라이언트명입니다: ${clientName}`);
      }
    }

    // 인증검사
    if (this._server.options.auth != null) {
      // 메소드 레벨 → 클래스 레벨 순으로 권한 확인
      const requiredPerms = getAuthPermissions(ServiceClass, def.methodName);

      // 권한 설정이 있으면 인증 필요
      if (requiredPerms != null) {
        const authTokenPayload = def.socket?.authTokenPayload ?? def.http?.authTokenPayload;

        // 권한이 필요한데 인증정보가 없으면 에러
        if (authTokenPayload == null) {
          throw new Error("로그인이 필요합니다.");
        }

        // 권한 목록 체크 (빈 배열이면 로그인만 체크)
        if (requiredPerms.length > 0) {
          const hasPerm = requiredPerms.some((perm) => authTokenPayload.roles.includes(perm));
          if (!hasPerm) {
            throw new Error("권한이 부족합니다.");
          }
        }
      }
    }

    // 서비스 인스턴스 생성 (Context 주입)
    const service = new ServiceClass();
    service.server = this._server;
    service.socket = def.socket;
    service.http = def.http;

    // 메소드 찾기
    const method = (service as unknown as Record<string, unknown>)[def.methodName];
    if (typeof method !== "function") {
      throw new Error(`메소드[${def.serviceName}.${def.methodName}]를 찾을 수 없습니다.`);
    }

    // 실행
    return await method.apply(service, def.params);
  }
}
