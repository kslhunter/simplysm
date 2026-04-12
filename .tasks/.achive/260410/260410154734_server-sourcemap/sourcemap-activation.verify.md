# 에러 발생 시 원본 소스 위치로 표시 — LLM 검증

## 검증 항목

- [x] `process.setSourceMapsEnabled(true)`가 `import()` 호출 전에 위치: `server-runtime.worker.ts:140`에서 호출, `import()`는 line 145. 순서 정확.
- [x] esbuild sourcemap 옵션이 dev 모드에서만 활성화: `esbuild-config.ts:88` — `sourcemap: options.dev === true ? "linked" : undefined`. dev 미설정 시 `undefined` (esbuild 기본값 `false`).
- [x] `writeChangedOutputFiles()`가 `.map` 파일을 정상 처리: line 21에서 `.js` 파일만 import 경로 변환, `.js.map`은 원본 그대로 기록. 기존 테스트(`does not transform non-.js files`)에서도 검증됨.
