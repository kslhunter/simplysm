# Orchestrator 환경변수 설정 중앙화 — LLM 검증

## 검증 항목

- [x] BaseOrchestrator에 `_baseEnv` protected 필드 추가됨: `BaseOrchestrator.ts:31`에 `protected _baseEnv!: { VER: string; DEV: string }` 확인
- [x] BaseOrchestrator.initialize()에서 getVersion + dev 파라미터로 _baseEnv 설정: `BaseOrchestrator.ts:69-71`에 `getVersion(this._cwd)` → `{ VER: version, DEV: params.dev ? "true" : "false" }` 확인
- [x] DevOrchestrator._initializeMode()에서 getVersion/baseEnv 코드 제거: `_initializeMode`는 `void` 반환, `getVersion` import도 제거됨
- [x] DevOrchestrator에서 private `_baseEnv` 필드 제거: BaseOrchestrator의 protected 필드를 상속
- [x] WatchOrchestrator는 변경 없음: BaseOrchestrator에서 _baseEnv가 자동 설정되며, WatchOrchestrator는 이를 사용하지 않아도 무해
- [x] 기존 테스트 업데이트: watch-orchestrator.spec.ts에서 `_baseEnv` 미존재 assertion 제거 (이제 Base 공통 필드)
