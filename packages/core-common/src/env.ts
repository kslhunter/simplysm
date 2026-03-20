declare const process: { env: { DEV?: string; VER?: string; [key: string]: string | undefined } };

declare global {
  interface ImportMeta {
    env?: Record<string, unknown>;
  }
}

const _metaEnv: Record<string, unknown> = import.meta.env ?? {};
const _processEnv: Record<string, unknown> = typeof process !== "undefined" ? process.env : {};
const _raw: Record<string, unknown> = { ..._metaEnv, ..._processEnv };

export const env: {
  DEV: boolean;
  VER?: string;
  [key: string]: unknown;
} = {
  ..._raw,
  DEV: JSON.parse(String(_raw["DEV"] != null && String(_raw["DEV"]) !== "" ? _raw["DEV"] : false)),
  VER: _raw["VER"] as string | undefined,
};
