import { Type } from "@simplysm/sd-core/common";
import { NextHandleFunction } from "connect";
import { SdServiceBase } from "./SdServiceBase";

export interface ISdServiceServerOptions {
  rootPath: string;
  services: Type<SdServiceBase>[];
  port: number;
  middlewares?: NextHandleFunction[];
  ssl?: {
    pfxBuffer: Buffer;
    passphrase: string;
  };
}
