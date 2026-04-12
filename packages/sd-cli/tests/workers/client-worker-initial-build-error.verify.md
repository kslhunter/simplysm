# 초기 빌드 에러 보고 — LLM 검증

## 검증 항목

- [x] client.worker.ts onEnd에서 초기 빌드 시 errors 필드가 포함되는지: `client.worker.ts:285-291` — `initialBuildResolve`에 `errors: result.errors.map((e) => e.text)` 포함 확인
- [x] EsbuildClientEngine.startWatch에서 반환값의 success 확인 후 에러 로깅하는지: `EsbuildClientEngine.ts:135-137` — `result != null && !result.success` 조건으로 `logger.error` 호출 확인. 테스트 실행 시 `[my-client] 초기 빌드 실패: Module not found: @angular/core; Syntax error in app.ts` 출력 확인
- [x] esbuild-client-config.ts에서 dev 모드 logLevel이 "warning"인지: `esbuild-client-config.ts:169` — `logLevel: isDev ? "warning" : "silent"` 확인. `isDev = options.mode === "dev"` (line 52)
- [x] esbuild-client-config.ts에서 build 모드 logLevel이 "silent"인지: 동일 라인 — 삼항 연산자의 false 분기가 `"silent"` 확인
