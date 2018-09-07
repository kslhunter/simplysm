export interface ISocketResponse {
  requestId: number | string;
  type: "response" | "error" | "split";
  body?: any;
}