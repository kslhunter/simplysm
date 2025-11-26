import { ISdServiceReconnectStrategy } from "./reconnect-strategy.types";

export interface ISdServiceConnectionConfig {
  port: number;
  host: string;
  ssl?: boolean;

  reconnectStrategy?: ISdServiceReconnectStrategy | false;
}
