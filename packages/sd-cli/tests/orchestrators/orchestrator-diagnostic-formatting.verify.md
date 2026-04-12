# Orchestrator 진단 포맷팅 공통 함수 사용 — LLM 검증

## 검증 항목

- [x] BuildOrchestrator._printBuildResults()가 formatDiagnosticsOutput()을 사용: `BuildOrchestrator.ts:465-468`에서 `formatDiagnosticsOutput(allDiagnostics, this._cwd)` 호출 확인. 기존 인라인 `FormatDiagnosticsHost` 생성 + `sortAndDeduplicateDiagnostics` + `formatDiagnosticsWithColorAndContext` 패턴이 제거됨
- [x] TypecheckOrchestrator._aggregateTypecheckResults()가 formatDiagnosticsOutput()을 사용: `TypecheckOrchestrator.ts:362`에서 `formatDiagnosticsOutput(allDiagnostics, this._cwd)` 호출 확인. 기존 인라인 `FormatDiagnosticsHost` + `sortAndDeduplicateDiagnostics` + `formatDiagnosticsWithColorAndContext` 패턴이 제거됨
- [x] BuildOrchestrator의 import에 `formatDiagnosticsOutput`이 추가됨 (line 15)
- [x] TypecheckOrchestrator의 import에 `formatDiagnosticsOutput`이 추가됨 (line 11)
- [x] 기존 동작 보존: BuildOrchestrator의 per-result 경고/에러 로깅 로직(`formatBuildMessages`)은 그대로 유지됨
- [x] 기존 동작 보존: TypecheckOrchestrator의 요약 로그/lint 결과 생성 로직은 그대로 유지됨
