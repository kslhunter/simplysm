export interface ISdServiceConnectionConfig {
  port: number;
  host: string;
  ssl?: boolean;

  maxReconnectCount?: number;
}
