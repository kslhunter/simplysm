import type { SdServiceServer } from "../SdServiceServer";
import type { SdServiceSocketV1 } from "../legacy/SdServiceSocketV1";
import type { SdServiceSocket } from "../transport/socket/SdServiceSocket";
import type { ISdServiceRequest } from "../legacy/protocol-v1.types";
import { SD_SERVICE_AUTH_META } from "../auth/auth.decorators";
import type { IAuthTokenPayload } from "../auth/IAuthTokenPayload";

export class SdServiceExecutor {
  constructor(private readonly _server: SdServiceServer) {}

  async runMethodAsync(def: {
    serviceName: string;
    methodName: string;
    params: any[];

    socket?: SdServiceSocket;
    v1?: { socket: SdServiceSocketV1; request: ISdServiceRequest };
    http?: { clientName: string; authTokenPayload?: IAuthTokenPayload };
  }): Promise<any> {
    // 서비스 클래스 찾기
    const ServiceClass = this._server.options.services.single(
      (item) => item.name === def.serviceName,
    );

    if (!ServiceClass) {
      throw new Error(`서비스[${def.serviceName}]를 찾을 수 없습니다.`);
    }

    // 요청 검증 (Gatekeeper)
    const clientName = def.v1?.request.clientName ?? def.socket?.clientName ?? def.http?.clientName;
    if (clientName != null) {
      // 상위 경로(..), 루트(/), 윈도우 경로(\) 포함 시 차단
      if (clientName.includes("..") || clientName.includes("/") || clientName.includes("\\")) {
        throw new Error(`[Security] 유효하지 않은 클라이언트명입니다: ${clientName}`);
      }
    }

    // 인증검사
    // 메소드 레벨 권한 확인
    if (this._server.options.auth) {
      let requiredPerms: string[] | undefined = Reflect.getMetadata(
        SD_SERVICE_AUTH_META,
        ServiceClass.prototype,
        def.methodName,
      );

      // 클래스 레벨 권한 확인 (메소드에 없으면)
      if (requiredPerms == null) {
        requiredPerms = Reflect.getMetadata(SD_SERVICE_AUTH_META, ServiceClass);
      }

      // 권한 설정이 없으면 통과 (Public API)
      if (requiredPerms) {
        // V1은 인증이 필요한 서비스에 접근 불가
        if (def.v1) {
          throw new Error("보안강화로 인한 접근 불가");
        }

        const authTokenPayload = def.socket?.authTokenPayload ?? def.http?.authTokenPayload;

        // 권한이 필요한데 인증정보가 없으면 에러
        if (!authTokenPayload) {
          throw new Error("로그인이 필요합니다.");
        }

        // 권한 목록 체크 (빈 배열이면 로그인만 체크)
        if (requiredPerms.length > 0) {
          const hasPerm = requiredPerms.some((perm) => authTokenPayload.perms.includes(perm));
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
    service.v1 = def.v1;
    service.http = def.http;

    // 메소드 찾기
    const method = (service as Record<string, any>)[def.methodName];
    if (typeof method !== "function") {
      throw new Error(`메소드[${def.serviceName}.${def.methodName}]를 찾을 수 없습니다.`);
    }

    // 실행
    return await method.apply(service, def.params);
  }
}
