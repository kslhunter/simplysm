export interface ISdServiceConnectionConfig {
  port: number;
  host: string;
  ssl?: boolean;

  disableReconnect?: boolean;
}
