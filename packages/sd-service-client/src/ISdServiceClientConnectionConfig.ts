import { IReconnectStrategy } from "./reconnect-strategy";

export interface ISdServiceClientConnectionConfig {
  port: number;
  host: string;
  ssl?: boolean;

  reconnect?: IReconnectStrategy | false;
}
