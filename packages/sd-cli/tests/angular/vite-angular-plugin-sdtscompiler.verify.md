# vite-angular-plugin SdTsCompiler 전환 — LLM 검증

## 검증 항목

- [x] AngularBuildPipeline import 제거: `vite-angular-plugin.ts:6` — `SdTsCompiler` import으로 교체, `AngularBuildPipeline` 미사용
- [x] SdTsCompiler 인스턴스 생성: `:69-81` — `new SdTsCompiler({ pkgDir, cwd, output: { js: true, dts: false }, sourceFileCache, compilerOptionsTransformer })` 올바르게 구성
- [x] compileAsync 호출: `:90` — `sdTsCompiler.compileAsync(modifiedFiles)` 호출, modifiedFiles는 pendingWatchChanges에서 수집
- [x] emitResults → emittedFilesBySource 매핑: `:93-95` — `pathx.posix(sourceFileName)` 키로 저장
- [x] transform 훅: `:107-124` — `emittedFilesBySource.get(normalizedId)` 조회, 인라인 소스맵 분리 유지
- [x] buildEnd에서 sdTsCompiler 참조 해제: `:127` — `sdTsCompiler = undefined`
- [x] watch 모드 증분 빌드: `:61-66` — pendingWatchChanges를 modifiedFiles로 전달, compileAsync에서 증분 처리
- [x] 이미 초기화됐고 변경 없으면 건너뜀: `:84-87` — `emittedFilesBySource.size > 0 && modifiedFiles == null` 조건
- [x] 기존 테스트 회귀: vite-angular-plugin.spec.ts 6개, vite-angular-plugin-vitest.spec.ts + legacy-watch.spec.ts 5개 모두 통과
