import type { Bytes } from "@simplysm/core-common";

export interface CryptoService {
  encrypt(data: string | Bytes): Promise<string>;
  encryptAes(data: Bytes): Promise<string>;
  decryptAes(encText: string): Promise<Bytes>;
}

export interface CryptoConfig {
  key: string;
}
