export interface ISdSocketResponse {
  requestId: number;
  type: "response" | "error" | "split";
  body?: any;
}
