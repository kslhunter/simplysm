# Feature 1.3 서버 빌드에 Worker 플러그인 적용 — LLM 검증

## 검증 항목

- [x] 프로덕션 빌드에 Worker 플러그인 포함: `server-build.worker.ts:169`에서 `plugins: [createWorkerBundlePlugin(), tscPlugin.plugin]`로 설정됨. Worker 플러그인이 tsc 플러그인보다 앞에 위치.
- [x] Watch/dev 빌드에 Worker 플러그인 포함: `server-esbuild-context.ts:66-69`에서 `workerPlugin` 변수로 생성 후 tsc 유무에 따라 `[workerPlugin, tscPlugin.plugin]` 또는 `[workerPlugin]`으로 설정됨.
- [x] Worker 패턴 없는 서버 코드 투명 통과: `esbuild-worker-plugin.ts:83-85`에서 `content.includes("Worker")`가 false면 즉시 `undefined` 반환. `esbuild-worker-plugin.ts:197`의 onLoad에서 `result == null`이면 `undefined` 반환하여 다음 핸들러에 위임.
- [x] 기존 tsc 플러그인/external 처리 미변경: `createServerEsbuildOptions` 함수 미수정. tsc 플러그인 생성 로직 미변경. external 처리 미변경.
- [x] import 경로에 `.js` 확장자 미사용: 두 파일 모두 `from "../esbuild/esbuild-worker-plugin"` (확장자 없음)
