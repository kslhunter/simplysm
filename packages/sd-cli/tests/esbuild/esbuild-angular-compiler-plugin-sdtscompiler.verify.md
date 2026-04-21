# esbuild-angular-compiler-plugin SdTsCompiler 전환 — LLM 검증

## 검증 항목

- SdTsCompiler 인스턴스 생성: `:402-414` — `new SdTsCompiler({ pkgDir: path.dirname(pluginOptions.tsconfig), cwd, output: { js: true, dts: false }, sourceFileCache, transformStylesheet, externalStylesheets, compilerOptionsTransformer })` 올바르게 구성
- compileAsync 호출: `:422-425` — 첫 빌드 시 `compileAsync(undefined, { additionalTransformers })`, 증분 빌드 시 `compileAsync(expandedModifiedFiles, { additionalTransformers })`
- emitResults → typeScriptFileCache 매핑: `:428-430` — `compileResult.emitResults`를 순회하여 `path.normalize(sourceFileName)` 키로 저장
- diagnostics 변환: `:441-448` — `convertSerializedDiagnosticToEsbuild(d, compileResult.program, cwd)` 사용, `d.category` 기반 분류
- HMR staleSourceFiles 캡처: `:380-388` — `lastResult.program.getSourceFile(modifiedFile)` 사용, compileAsync 전에 수행
- HMR collectHmrCandidates: `:468-471` — `compileResult.ngtscProgram` 사용, staleSourceFiles 전달
- SCSS bridging: `:451-462` — `pluginOptions.stylesheetDependencies`/`stylesheetErrors` 직접 읽기 (plugin-owned maps)
- parseTsconfigFile 함수 제거 확인: 파일 전체에서 `parseTsconfigFile` 미발견
- AngularCompiler import 제거 확인: `:7` — `import type { AngularSourceFileCache }` (type import만 유지)
- onDispose에서 참조 해제: `sdTsCompiler = undefined; lastResult = undefined;` 확인
- onLoad 플래그 결정: `:432-438` — `lastResult == null` 조건으로 첫 빌드에서만 결정
