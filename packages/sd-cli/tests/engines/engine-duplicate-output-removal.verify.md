# 엔진별 중복 출력 제거 — LLM 검증

## 검증 항목

- [x] esbuild-client-config.ts logLevel이 모든 모드에서 "silent"인지: `esbuild-client-config.ts:191` — `logLevel: "silent"` 확인. 기존 `isDev ? "warning" : "silent"` 삼항 연산자 제거됨
- [x] EsbuildClientEngine에 중복 error 핸들러가 없는지: `EsbuildClientEngine.ts:103-110` — setupWatchEvents만 error 이벤트 처리. 기존 `worker.on("error", ...)` 핸들러(logger.error 호출) 제거됨
- [x] EsbuildClientEngine 초기 빌드 실패 시 logger.error 미호출: `EsbuildClientEngine.ts:129-138` — `!result.success` 분기에서 `resultCollector.add()`만 호출. logger.error 줄 제거됨
- [x] BaseEngine에 logger.warn() 블록이 없는지: `BaseEngine.ts:166-180` — build 이벤트 핸들러에 lint 결과 보고만 존재. warnings에 대한 logger.warn() 블록 제거됨
- [x] BaseEngine startWatch 실패 시 logger.debug 사용: `BaseEngine.ts:182-183` — `logger.debug(...)` 확인. 기존 `logger.error(...)` → `logger.debug(...)` 변경됨
- [x] BaseEngine lint 결과 보고 로직 유지: `BaseEngine.ts:170-179` — `event.lint != null` 조건의 ResultCollector 보고 로직이 그대로 유지됨
