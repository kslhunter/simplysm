import { SdServiceServer } from "../SdServiceServer";
import { ISdServiceRequest } from "@simplysm/sd-service-common";
import { SdServiceSocket } from "./SdServiceSocket";

export class SdServiceExecutor {
  constructor(private readonly _server: SdServiceServer) {}

  async runMethodAsync(def: {
    serviceName: string;
    methodName: string;
    params: any[];

    socket?: SdServiceSocket;
    request?: ISdServiceRequest;
  }): Promise<any> {
    // 1. 서비스 클래스 찾기
    const ServiceClass = this._server.options.services.single(
      (item) => item.name === def.serviceName,
    );

    if (!ServiceClass) {
      throw new Error(`서비스[${def.serviceName}]를 찾을 수 없습니다.`);
    }

    // 3. 서비스 인스턴스 생성 (Context 주입)
    const service = new ServiceClass();
    service.server = this._server;
    service.request = def.request;
    service.socketClient = def.socket;

    // 4. 메소드 찾기
    const method = service[def.methodName];
    if (typeof method !== "function") {
      throw new Error(`메소드[${def.serviceName}.${def.methodName}]를 찾을 수 없습니다.`);
    }

    // 5. 실행
    return await method.apply(service, def.params);
  }
}
