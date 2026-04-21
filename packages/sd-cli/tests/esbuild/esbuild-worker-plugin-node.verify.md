# import.meta.resolve Worker 패턴 — LLM 검증

## 검증 항목

- `NODE_WORKER_PATTERN` 정규식이 상대 경로만 감지: `esbuild-worker-plugin.ts:25` — `(\.\.?\/[^"']+)` 패턴으로 `./` 또는 `../`로 시작하는 경로만 캡처. `"some-package"` 같은 절대 모듈 경로는 매칭되지 않음.
- `bundleWorker`에 platform 파라미터 추가: `esbuild-worker-plugin.ts:42` — `platform: esbuild.Platform` 파라미터 사용. 기존 `"browser"` 하드코딩 제거.
- 브라우저 Worker 패턴이 `platform: "browser"`로 빌드: `esbuild-worker-plugin.ts:137` — `processWorkerBundle(fullWorkerPath, "browser")` 호출. 기존 동작 유지.
- Node.js Worker 패턴이 메인 빌드의 platform 계승: `esbuild-worker-plugin.ts:149` — `build.initialOptions.platform ?? "browser"` 사용. 서버 빌드(platform: "node")에서는 "node"로 빌드.
- 경로 치환이 `new URL("path", import.meta.url).href` 형태: `esbuild-worker-plugin.ts:153` — `new URL("${workerCodePath}", import.meta.url).href` 반환. file:// URL을 반환하므로 core-node Worker 호환.
- 기존 브라우저 Worker 테스트 22개 모두 통과: `pnpm test --run` 결과 32개 전체 통과 (기존 22 + 신규 10).
- `external: undefined` 설정 유지: `esbuild-worker-plugin.ts:62` — 메인 빌드의 external이 Worker 번들에 상속되지 않음.
