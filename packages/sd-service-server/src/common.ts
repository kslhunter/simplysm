export interface ISdServiceRequest {
  type: "request";
  id: number;
  command: string;
  params: any[];
}

export interface ISdServiceResponse {
  type: "response";
  requestId: number;
  body?: any;
}

export interface ISdServiceErrorResponse {
  type: "error";
  requestId: number;
  message: string;
  stack: string;
}
