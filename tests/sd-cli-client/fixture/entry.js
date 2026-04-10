/* eslint-disable no-restricted-syntax -- env 주입 테스트 fixture */
// Simulates core-common/env.ts — import.meta.env spread pattern
const _metaEnv = { ...import.meta.env };
export const DEV = _metaEnv.DEV;
export const VER = _metaEnv.VER;
