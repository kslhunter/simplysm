import { SdServiceServer } from "../SdServiceServer";
import { SdServiceSocketV1 } from "../v1/SdServiceSocketV1";
import { SdServiceSocket } from "./SdServiceSocket";
import { ISdServiceRequest } from "../v1/protocol-v1.types";

export class SdServiceExecutor {
  constructor(private readonly _server: SdServiceServer) {}

  async runMethodAsync(def: {
    serviceName: string;
    methodName: string;
    params: any[];

    socket?: SdServiceSocket;

    v1?: {
      socket: SdServiceSocketV1;
      request: ISdServiceRequest;
    };
  }): Promise<any> {
    // 1. 서비스 클래스 찾기
    const ServiceClass = this._server.options.services.single(
      (item) => item.name === def.serviceName,
    );

    if (!ServiceClass) {
      throw new Error(`서비스[${def.serviceName}]를 찾을 수 없습니다.`);
    }

    // 요청 검증 (Gatekeeper)
    const clientName = def.v1?.request.clientName ?? def.socket?.clientName;
    if (clientName != null) {
      // 상위 경로(..), 루트(/), 윈도우 경로(\) 포함 시 차단
      if (clientName.includes("..") || clientName.includes("/") || clientName.includes("\\")) {
        throw new Error(`[Security] 유효하지 않은 클라이언트명입니다: ${clientName}`);
      }
    }

    // v2의 권한검사 로직
    this._checkAuthorize(ServiceClass, def.methodName, def.socket?.authInfo);

    // 3. 서비스 인스턴스 생성 (Context 주입)
    const service = new ServiceClass();
    service.server = this._server;
    service.v1 = def.v1;
    service.socket = def.socket;

    // 4. 메소드 찾기
    const method = service[def.methodName];
    if (typeof method !== "function") {
      throw new Error(`메소드[${def.serviceName}.${def.methodName}]를 찾을 수 없습니다.`);
    }

    // 5. 실행
    return await method.apply(service, def.params);
  }

  private _checkAuthorize(ServiceClass: any, methodName: string, token: string | undefined) {
    // 1. 메소드 레벨 권한 확인
    let required = Reflect.getMetadata(
      "sd-service:authorize",
      ServiceClass.prototype,
      methodName,
    ) as boolean | undefined;

    // 2. 클래스 레벨 권한 확인 (메소드에 없으면)
    if (required == null) {
      required = Reflect.getMetadata("sd-service:authorize", ServiceClass) as boolean | undefined;
    }

    // 권한 설정이 없으면 통과 (Public API)
    if (!required) return;

    // 권한이 필요한데 인증정보가 없으면 에러
    if (token == null) {
      throw new Error("로그인이 필요합니다.");
    }
  }
}
