# _initializeMode 시그니처 정리 — LLM 검증

## 검증 항목

- [x] BaseOrchestrator._initializeMode 추상 메서드에서 `options: string[]` 파라미터 제거: `BaseOrchestrator.ts:109-111`에 `(config: SdConfig, targets: string[])` 2개 파라미터만 확인
- [x] BaseOrchestrator.initialize() 호출부에서 options 인자 제거: `BaseOrchestrator.ts:79`에 `_initializeMode(sdConfig, params.targets)` 확인
- [x] options는 BaseOrchestrator.initialize()의 loadSdConfig()에서만 사용됨: `BaseOrchestrator.ts:53`에 `opt: params.options` 확인
- [x] DevOrchestrator._initializeMode 시그니처 변경 불필요: 이미 `(config, targets)` 2개 파라미터
- [x] WatchOrchestrator._initializeMode 시그니처 변경 불필요: 이미 `(config, targets)` 2개 파라미터
