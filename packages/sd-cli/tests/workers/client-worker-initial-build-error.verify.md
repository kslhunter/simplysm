# 초기 빌드 에러 보고 — LLM 검증

## 검증 항목

- [x] client.worker.ts onEnd에서 초기 빌드 시 errors 필드가 포함되는지: `client.worker.ts:285-291` — `initialBuildResolve`에 `errors: result.errors.map((e) => e.text)` 포함 확인
- [x] EsbuildClientEngine.startWatch에서 반환값의 success 확인 후 ResultCollector에 보고하는지: `EsbuildClientEngine.ts:129-138` — `!result.success` 조건으로 `resultCollector.add()` 호출 확인. logger.error는 Feature 1.2에서 제거됨 (중복 출력 방지)
- [x] esbuild-client-config.ts에서 logLevel이 "silent"인지: `esbuild-client-config.ts:191` — `logLevel: "silent"` 확인. Feature 1.2에서 dev/build 모두 "silent"로 통일됨
