export interface ISdServerResponse {
  requestId: number;
  type: "response" | "error" | "split";
  body?: any;
}

export interface ISdServerEmitResponse {
  eventListenerId: number;
  data?: any;
}
