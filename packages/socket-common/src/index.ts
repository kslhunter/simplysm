export interface ISocketResponse {
  requestId: number | string;
  type: "response" | "error";
  body?: any;
}

export interface ISocketRequest {
  id: number;
  command: string;
  params: any[];
}