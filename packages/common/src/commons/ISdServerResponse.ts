export interface ISdServerResponse {
  requestId: number | string;
  type: "response" | "error" | "split";
  body?: any;
}
