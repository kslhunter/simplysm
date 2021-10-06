export interface ISdServiceRequest {
  type: "request";
  password: string | undefined;
  id: number;
  url: string;
  command: string;
  params: any[];
}

export interface ISdServiceSplitRawRequest {
  type: "split";
  password: string | undefined;
  id: number;
  url: string | undefined;
  index: number;
  length: number;
  data: string;
}

export interface ISdServiceUploadRawRequest {
  type: "upload";
  password: string | undefined;
  id: number;
  url: string;
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
  stack?: string;
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


export interface ISmtpClientSendOption {
  host: string;
  port?: number;
  secure?: boolean;
  user: string;
  pass: string;

  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  attachments?: ISmtpClientSendAttachment[];
}

export interface ISmtpClientSendAttachment {
  filename: string;
  content?: Buffer;
  path?: any;
  contentType?: string;
}

export interface ISmtpClientSendByDefaultOption {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  attachments?: ISmtpClientSendAttachment[];
}
