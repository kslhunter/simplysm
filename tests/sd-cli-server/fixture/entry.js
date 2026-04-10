/* eslint-disable no-restricted-properties -- env 주입 테스트 fixture */
// Simulates core-common/env.ts — process.env spread pattern
const _processEnv = typeof process !== "undefined" ? process.env : {};
process.stdout.write(JSON.stringify({ DEV: _processEnv.DEV, VER: _processEnv.VER }));
