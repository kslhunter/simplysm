export interface ISdServiceRequest {
  id: number;
  url: string;
  command: string;
  headers: { [key: string]: any };
  params: any[];
}

export interface ISdServiceResponse {
  requestId: number;
  type: "response" | "error" | "split" | "upload" | "checkMd5";
  body?: any;
}

export interface ISdServiceEmitResponse {
  eventListenerId: number;
  data?: any;
}

export interface ISdServiceSmtpClientConfig {
  user: string;
  pass: string;
  host: string;
  port?: number;
  secure?: boolean;
  senderName: string;
  senderEmail?: string;
}

export interface ISdServiceCryptoConfig {
  key: string;
}