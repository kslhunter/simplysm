# SdTsCompiler 크래시 핸들링 — LLM 검증

## 검증 항목

### 구조적 검증

- 단계별 try-catch: compileAsync 내 analyzeAsync, findAffectedFiles, emit, collectDiagnostics, lintAndGlobalScss 각각이 개별 try-catch로 감싸져 있는지 확인
- 바깥 try-catch 유지: 단계별 try-catch를 감싸는 최종 안전망 try-catch가 존재하는지 확인
- SdError 사용: catch 블록에서 SdError(원본에러, context)로 감싸는지 확인
- crashDiagnostics 누적: 각 단계 catch에서 SerializedDiagnostic을 배열에 누적하고, 최종 결과에 합산하는지 확인
- per-file 프로브 제거: _probeCrashPerFileAngular, _probeCrashPerFileTsc 메서드가 삭제되었는지 확인

### 파일 추적 검증

- _findAffectedFilesForTsc: ignoreSourceFile 콜백으로 _setCrashContext("findAffectedFiles", sourceFile.fileName)를 호출하는지 확인
- _findAffectedFilesForAngular: 기존 콜백에 _setCrashContext("findAffectedFiles", sourceFile.fileName) 추가, 기존 ngtypecheck 필터링 로직 유지 확인
- _collectDiagnosticsForTsc: 파일 단위 루프로 분리되어 _setCrashContext("collectDiagnostics", sourceFile.fileName)를 호출하는지 확인
- _collectDiagnosticsForAngular: 기존 파일 추적 유지 확인

### 단계 간 의존성 검증

- analyzeAsync 크래시 시: _ngtscProgram 미설정 → Angular emit/diagnostics에서 null 체크로 스킵하는지 확인
- findAffectedFiles 크래시 시: affectedFiles=undefined(전체), _affectedSourceFiles 빈 Set → emit/diagnostics가 전체 대상으로 동작하는지 확인
- _createCrashDiagnostic: SdError cause chain으로 원본 에러 메시지+스택이 보존되는지 확인
