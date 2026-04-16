# SdTsCompiler — LLM 검증

## 검증 항목

### Angular host 확장 (Slice 2)

- [x] **readResource 콜백 등록**: `SdTsCompiler.ts:268` — `hostAny["readResource"]`가 `host.readFile` 위임. `angular-compiler.ts:181-183`의 패턴과 동일 확인
- [x] **transformResource 콜백 등록**: `SdTsCompiler.ts:271-286` — `transformStylesheet` 옵션이 있을 때만 등록. context.type !== "style" 시 null 반환, 빈 데이터 시 `{ content: "" }` 반환. `angular-compiler.ts:186-203`의 패턴과 동일
- [x] **getModifiedResourceFiles 콜백**: `SdTsCompiler.ts:289-292` — `sourceFileCache`가 있을 때만 등록, `cache.modifiedFiles` 반환. `angular-compiler.ts:206-208`의 패턴과 동일
- [x] **resourceNameToFileName 콜백**: `SdTsCompiler.ts:295-312` — 경로 해석 + `externalStylesheets` 처리 + `hasTemplateExtension` 분기. `angular-compiler.ts:210-228`의 패턴과 동일

### moduleResolutionCache 재사용 (Slice 2)

- [x] **초기 생성**: `SdTsCompiler.ts:252-253` — `ts.createModuleResolutionCache(cwd, canonicalize, options, this._packageJsonCache)` 호출. 4번째 인자로 `this._packageJsonCache` 전달
- [x] **packageJsonCache 추출**: `SdTsCompiler.ts:256-258` — 첫 호출 시 `moduleResolutionCache.getPackageJsonInfoCache()`로 추출하여 `_packageJsonCache`에 저장
- [x] **후속 호출 시 재사용**: 두 번째 `compileAsync` 호출 시 `this._packageJsonCache`가 null이 아니므로 `createModuleResolutionCache`의 4번째 인자로 전달됨 → 패키지 해석 결과 재사용

### sourceFileCache 관리 (Slice 2-3)

- [x] **외부 제공 시 사용**: `SdTsCompiler.ts:117` — `this._options.sourceFileCache ?? new AngularSourceFileCache()` 패턴으로 외부 제공 시 우선 사용
- [x] **미제공 시 내부 생성**: 위 라인에서 `??` 연산자로 `AngularSourceFileCache` 내부 생성
- [x] **augmentHostWithCaching 적용**: `SdTsCompiler.ts:118` — Angular 프로그램 생성 직전에 `augmentHostWithCaching(host, this._sourceFileCache)` 호출
- [x] **증분 빌드 시 무효화**: `SdTsCompiler.ts:74-76` — `modifiedFiles != null && size > 0 && _sourceFileCache != null` 조건으로 `sourceFileCache.invalidate(modifiedFiles)` 호출

### Non-Angular writeFile 훅 (Slice 2)

- [x] **emit 모드에서만 설정**: `SdTsCompiler.ts:238` — `!isForAngular && needsEmit` 조건으로 writeFile 훅 적용
- [x] **createOutputPathRewriter 사용**: `SdTsCompiler.ts:239` — `createOutputPathRewriter(pkgDir)` 호출
- [x] **addJsExtensionToImports 적용**: `SdTsCompiler.ts:243` — `.js` 파일에만 `addJsExtensionToImports` 적용
- [x] **result null 시 쓰기 스킵**: `SdTsCompiler.ts:241` — `result != null` 체크로 다른 패키지 출력 무시

### compilerOptions 구성 순서 (Slice 1)

- [x] **순서 확인**: `SdTsCompiler.ts:170-225` — env 조정(171) → output 플래그(175-202) → angular 병합(205) → tsBuildInfoFile(210) → transformer(221) 순서 확인

### Program 생성 분기 (Slice 3)

- [x] **Non-Angular**: `SdTsCompiler.ts:138-142` — `createEmitAndSemanticDiagnosticsBuilderProgram(rootNames, options, host, oldBuilderProgram)` 4인자 오버로드
- [x] **Angular**: `SdTsCompiler.ts:120-135` — NgtscProgram → getTsProgram → ensureSourceFileVersions → createEmitAndSemanticDiagnosticsBuilderProgram(tsProgram, host, old) → analyzeAsync
- [x] **증분 빌드 상태**: `SdTsCompiler.ts:145` — `this._builderProgram = builderProgram` 저장. 다음 호출 시 `this._builderProgram`이 old로 전달됨
- [x] **Angular 증분**: `SdTsCompiler.ts:123` — `this._ngtscProgram`을 NgtscProgram 4번째 인자로 전달. `SdTsCompiler.ts:136` — `this._ngtscProgram = angularProgram` 저장
