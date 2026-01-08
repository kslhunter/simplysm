export interface ICryptoService {
  encrypt(data: string | Buffer): Promise<string>;
  encryptAes(data: Buffer): Promise<string>;
  decryptAes(encText: string): Promise<Buffer>;
}

export interface ICryptoConfig {
  key: string;
}
