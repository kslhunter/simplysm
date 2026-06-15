import type { ServiceDefinition } from "../core/define-service";
import type { V1RequestHandler } from "../legacy/v1-auto-update-handler";

export interface ServiceServerOptions {
  rootPath: string;
  port: number;
  ssl?:
    | {
        pfxBytes: Uint8Array;
        passphrase?: string;
      }
    | {
        pemKeyBytes: Uint8Array;
        certBytes: Uint8Array;
        caBytes?: Uint8Array;
        passphrase?: string;
      }
    | {
        letsencrypt: {
          domains: string[];
          email: string;
          staging?: boolean;
        };
      };
  auth?:
    | {
        jwtSecret: string;
      }
    | false;
  services: ServiceDefinition[];
  legacyV1Handlers?: V1RequestHandler[];
}
