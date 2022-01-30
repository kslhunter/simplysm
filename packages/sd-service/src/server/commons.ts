import { Type } from "@simplysm/sd-core-common";
import { ISdServiceBase } from "../commons";

export interface ISdServiceServerOptions {
  services: Type<ISdServiceBase>[];
  port: number;
  ssl?: {
    pfxBuffer: Buffer;
    passphrase: string;
  };
}
