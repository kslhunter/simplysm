export interface ISdServiceBase {
}

export interface ISdServiceRequest {
  uuid: string;
  serviceName: string;
  methodName: string;
  params: any[];
}

export interface ISdServiceResponse {
  type: "error" | "response";
  body: any;
}
