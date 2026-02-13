import type { ServiceDefinition } from "../core/define-service";

export interface ServiceServerOptions {
  rootPath: string;
  port: number;
  ssl?: {
    pfxBytes: Uint8Array;
    passphrase: string;
  };
  auth?: {
    jwtSecret: string;
  };
  services: ServiceDefinition[];
}
