export interface ISdServiceBase {
}

export interface ISdServiceRequest {
  uuid: string;
  command: string;
  params: any[];
}

export interface ISdServiceResponse {
  type: "error" | "response";
  body: any;
}
