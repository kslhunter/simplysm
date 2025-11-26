export interface ISdCryptoService {
  encrypt(data: string | Buffer): string;
  encryptAes(data: Buffer): string;
  decryptAes(encText: string): Buffer;
}

export interface ICryptoConfig {
  key: string;
}
