export interface ServiceConnectionConfig {
  port: number;
  host: string;
  ssl?: boolean;
  /** Set to 0 to disable reconnect; disconnects immediately */
  maxReconnectCount?: number;
}
