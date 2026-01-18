export interface CryptoService {
  encrypt(data: string | Uint8Array): Promise<string>;
  encryptAes(data: Uint8Array): Promise<string>;
  decryptAes(encText: string): Promise<Uint8Array>;
}

export interface CryptoConfig {
  key: string;
}
