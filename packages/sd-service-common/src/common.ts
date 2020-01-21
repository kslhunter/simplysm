export interface ISdServiceRequest {
  type: "request";
  id: number;
  command: string;
  params: any[];
}

export interface ISdServiceSplitRawRequest {
  type: "split";
  id: number;
  index: number;
  length: number;
  data: string;
}

export interface ISdServiceUploadRawRequest {
  type: "upload";
  id: number;
  filePath: string;
  offset: number;
  length: number;
  buffer: Buffer;
}

export type TSdServiceRawRequest =
  ISdServiceSplitRawRequest
  | ISdServiceUploadRawRequest
  | ISdServiceRequest;

export interface ISdServiceEventResponse {
  type: "event";
  eventListenerId: number;
  body?: any;
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

export interface ISdServiceSplitRawResponse {
  type: "split";
  requestId: number;
  length: number;
}

export interface ISdServiceUploadRawResponse {
  type: "upload";
  requestId: number;
  length: number;
}


export type TSdServiceRawResponse =
  ISdServiceSplitRawResponse
  | ISdServiceUploadRawResponse
  | ISdServiceResponse
  | ISdServiceEventResponse
  | ISdServiceErrorResponse;
