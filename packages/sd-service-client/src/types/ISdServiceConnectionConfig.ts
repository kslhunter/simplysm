export interface ISdServiceConnectionConfig {
  port: number;
  host: string;
  ssl?: boolean;

  // 0 입력시 reconnect안함. 바로 끊김
  maxReconnectCount?: number;
}
