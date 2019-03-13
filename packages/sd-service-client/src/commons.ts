export interface ISdWebSocketRequest {
  id: number;
  url: string;
  command: string;
  params: any[];
}

export interface ISdWebSocketResponse {
  requestId: number;
  type: "response" | "error" | "split" | "upload" | "checkMd5";
  body?: any;
}

export interface ISdWebSocketEmitResponse {
  eventListenerId: number;
  data?: any;
}
