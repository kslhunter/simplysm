export interface ISocketResponse {
  requestId: number | string;
  type: "response" | "error";
  body?: any;
}