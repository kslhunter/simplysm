// Simulates core-common/env.ts — import.meta.env spread pattern
const _metaEnv = { ...import.meta.env };
export const DEV = _metaEnv.DEV;
export const VER = _metaEnv.VER;
