/* eslint-disable no-restricted-properties, no-restricted-syntax -- env() 구현체 */
declare const process: { env: Record<string, string | undefined> };

declare global {
  interface ImportMetaEnv extends Record<string, unknown> {}
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

/**
 * 환경변수 값을 boolean으로 파싱
 * "true", "1", "yes", "on" (대소문자 무시) → true, 그 외 → false
 */
export function parseBoolEnv(value: unknown): boolean {
  return ["true", "1", "yes", "on"].includes(String(value ?? "").toLowerCase());
}

/**
 * 환경변수 get/set 함수
 * - `env(key)` — 값 읽기 (process.env 우선, fallback import.meta.env)
 * - `env(key, value)` — 값 쓰기 (process.env에 저장)
 */
export function env(key: string): string | undefined;
export function env(key: string, value: string): void;
export function env(key: string, value?: string): string | undefined | void {
  if (arguments.length >= 2) {
    if (typeof process !== "undefined") {
      process.env[key] = value;
    }
    return;
  }


  if (typeof process !== "undefined") {
    const val = process.env[key];
    if (val !== undefined) return val;
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Node.js에서 import.meta.env는 undefined
  const metaVal = import.meta.env?.[key];
  return metaVal != null ? String(metaVal) : undefined;
}
