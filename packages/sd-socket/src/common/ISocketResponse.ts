export interface ISocketResponse {
  header: {
    success: boolean;
    fileToken?: string;
  };
  body?: any;
}
