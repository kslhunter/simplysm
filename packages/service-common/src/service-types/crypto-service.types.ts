import type { Bytes } from "@simplysm/core-common";

/**
 * 암호화 서비스 인터페이스
 *
 * SHA256 해시 및 AES 대칭키 암호화/복호화 기능을 제공한다.
 */
export interface CryptoService {
  /** SHA256 해시 생성 */
  encrypt(data: string | Bytes): Promise<string>;
  /** AES 암호화 */
  encryptAes(data: Bytes): Promise<string>;
  /** AES 복호화 */
  decryptAes(encText: string): Promise<Bytes>;
}

/**
 * 암호화 서비스 설정
 */
export interface CryptoConfig {
  /** AES 암호화 키 */
  key: string;
}
