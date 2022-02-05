import { Type } from "@simplysm/sd-core-common";
import { ISdServiceBase } from "../commons";
import { NextHandleFunction } from "connect";

export interface ISdServiceServerOptions {
  rootPath: string;
  services: Type<ISdServiceBase>[];
  port: number;
  middlewares?: NextHandleFunction[];
  ssl?: {
    pfxBuffer: Buffer;
    passphrase: string;
  };
}
