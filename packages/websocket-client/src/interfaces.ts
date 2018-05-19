export interface IWebSocketResponse {
  requestId: number | string;
  type: "response" | "file" | "error";
  body?: any;
}

export interface IWebSocketRequest {
  id: number;
  command: string;
  headers?: object;
  params: any[];
}