# 진단 수집 — LLM 검증

## 검증 항목

- Angular TS 5.9 getSemanticDiagnostics 크래시 방어: `_collectDiagnosticsForAngular`에서 `builderProgram.getSemanticDiagnostics(sourceFile)`를 try-catch로 감싸고, catch 시 빈 배열로 처리 (`SdTsCompiler.ts` `_collectDiagnosticsForAngular` 메서드 내 per-file 루프)
- Angular diagnosticCache 갱신: affected 파일이면 `getDiagnosticsForFile` 호출 후 `this._diagnosticCache.set(sourceFile, angularDiagnostics)` 수행 (`SdTsCompiler.ts` `_collectDiagnosticsForAngular` 메서드)
- Angular diagnosticCache 반환: 비-affected 파일이면 `this._diagnosticCache.get(sourceFile)` 캐시 결과 반환 (`SdTsCompiler.ts` `_collectDiagnosticsForAngular` 메서드)
- Angular ignoreForDiagnostics 건너뜀: per-file 루프에서 `angularCompiler.ignoreForDiagnostics.has(sourceFile)` 체크 후 continue
- Non-Angular 7종 진단 수집: `_collectDiagnosticsForTsc`에서 config + syntactic + options + global + semantic + declaration 진단 수집 (declaration은 `!output.dts` 조건)
- isWorkspaceDiagnostic 필터링: `_finalizeDiagnostics`에서 `rawDiagnostics.filter(d => isWorkspaceDiagnostic(d, this._options.cwd))` 적용
- serializeDiagnostic 직렬화: `_finalizeDiagnostics`에서 `filtered.map(serializeDiagnostic)` 적용
- formatDiagnosticError 포맷: `_finalizeDiagnostics`에서 Error 카테고리 진단을 `formatDiagnosticError`로 포맷하여 `errors` 배열 생성
