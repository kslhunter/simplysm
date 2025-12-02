import { SdServiceServer } from "../SdServiceServer";
import { SdServiceSocketV1 } from "../v1/SdServiceSocketV1";
import { SdServiceSocketV2 } from "../v2/SdServiceSocketV2";
import { ISdServiceRequest } from "../v1/protocol-v1.types";

export class SdServiceExecutor {
  constructor(private readonly _server: SdServiceServer) {}

  async runMethodAsync(def: {
    serviceName: string;
    methodName: string;
    params: any[];

    socket?: SdServiceSocketV2;

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
}
