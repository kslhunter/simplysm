declare const process: { env: { DEV?: string; VER?: string; [key: string]: string | undefined } };

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

const _metaEnv: Record<string, unknown> = { ...import.meta.env };
const _processEnv: Record<string, unknown> = typeof process !== "undefined" ? process.env : {};
const _raw: Record<string, unknown> = { ..._metaEnv, ..._processEnv };

export const env: {
  DEV: boolean;
  VER?: string;
  [key: string]: unknown;
} = {
  ..._raw,
  DEV: parseBoolEnv(_raw["DEV"]),
  VER: _raw["VER"] as string | undefined,
};
