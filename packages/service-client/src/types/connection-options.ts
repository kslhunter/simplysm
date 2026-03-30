export interface ServiceConnectionOptions {
  port: number;
  host: string;
  ssl?: boolean;
  /** 0으로 설정하면 재연결을 비활성화하고 즉시 연결을 끊음 */
  maxReconnectCount?: number;
}
