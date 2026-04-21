# onEnd 비동기 동기화 — LLM 검증

## 검증 항목

- onEnd 타입이 `void | Promise<void>`를 허용: `esbuild-client-config.ts:29` — `onEnd?: (result: esbuild.BuildResult) => void | Promise<void>;`
- sd-on-end 플러그인이 onEnd 반환값을 return: `esbuild-client-config.ts:220` — `return options.onEnd!(result);`
- client.worker.ts onEnd가 async 직접 전달 (fire-and-forget 제거): `client.worker.ts:240` — `onEnd: async (result: esbuild.BuildResult) => {` (이전의 `void (async () => { ... })()` 패턴 제거됨)
