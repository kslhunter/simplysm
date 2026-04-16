# affected files 추적 — LLM 검증

## 검증 항목

- [x] Non-Angular 전역 변경 시 affectedFiles=undefined: `_findAffectedFilesForTsc`에서 `result.affected`가 `ts.SourceFile`이 아닌 경우(`"fileName" in result.affected` 실패) `return undefined`를 반환. (`SdTsCompiler.ts:272-275`)
- [x] Angular TypeScript 5.9 크래시 방어: `_findAffectedFilesForAngular`에서 `getSemanticDiagnosticsOfNextAffectedFile`를 try-catch로 감싸고, catch 시 전체 소스를 affected로 처리 (`SdTsCompiler.ts:290-298`)
- [x] Angular 리소스 의존성 기반 추가 affected: `_findAffectedFilesForAngular`에서 `sourceFileCache.modifiedFiles`와 `angularCompiler.getResourceDependencies(sourceFile)`를 비교하여 매칭 시 `_diagnosticCache.delete(sourceFile)` + `affectedSourceFiles.add(sourceFile)` (`SdTsCompiler.ts:317-334`)
- [x] Angular .ngtypecheck.ts → 원본 .ts 매핑: `getSemanticDiagnosticsOfNextAffectedFile`의 두 번째 인자 콜백에서 `.ngtypecheck.ts` 파일을 원본 `.ts`로 매핑하여 affected에 추가 (`SdTsCompiler.ts:284-295`)
