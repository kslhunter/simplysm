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
          /**
           * Cloudflare API 토큰(`Zone:Read` + `Zone.DNS:Edit` 권한).
           * 지정 시 DNS-01 챌린지(Cloudflare 자동 TXT 등록)로 발급한다.
           * 미지정 시 기존 TLS-ALPN-01 챌린지로 발급한다.
           */
          cloudflareApiToken?: string;
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
