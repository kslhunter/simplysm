export interface ISdWebSocketRequest {
  id: number;
  url: string;
  command: string;
  params: any[];
}

export interface ISdWebSocketResponse {
  requestId: number;
  type: "response" | "error" | "split";
  body?: any;
}

export interface ISdWebSocketEmitResponse {
  eventListenerId: number;
  data?: any;
}
