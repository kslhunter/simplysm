import type { Type } from "@simplysm/core-common";
import type { ServiceBase } from "../core/service-base";

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
  services: Type<ServiceBase>[];
}
