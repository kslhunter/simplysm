# Feature 2.1 컴포넌트 스타일시트 번들링 — LLM 검증

## 검증 항목

### AngularCompilerPluginOptions 인터페이스 확장

- `stylesheetDependencies?: Map<string, Set<string>>` 필드 존재: `esbuild-angular-compiler-plugin.ts:42` — `Map<string, Set<string>>` 타입으로 선언됨. `createClientTransformStylesheet`의 `scssDependencies` 타입과 일치
- `stylesheetErrors?: string[]` 필드 존재: `esbuild-angular-compiler-plugin.ts:44` — `string[]` 타입으로 선언됨. `createClientTransformStylesheet`의 `scssErrors` 타입과 일치

### onStart — stylesheetErrors 리셋

- 리셋 코드가 try 블록 **앞**에 위치: `esbuild-angular-compiler-plugin.ts:204-207` — `if (pluginOptions.stylesheetErrors != null) { pluginOptions.stylesheetErrors.length = 0; }` 가 `try {` (`:209`) 이전에 위치. 컴파일 실패 시에도 리셋이 보장됨
- null guard 존재: `pluginOptions.stylesheetErrors != null` 체크로 미제공 시 TypeError 방지

### onStart — stylesheetDependencies → FileReferenceTracker 브릿징

- 브릿징 코드가 emit 후, additionalResults 수집 전에 위치: `esbuild-angular-compiler-plugin.ts:315-320` — `emitAffectedFiles` 루프(`:300-303`)와 `diagnostics 수집`(`:305-313`) 후, `additionalResults 에러 수집`(`:322`) 전에 위치
- `referencedFileTracker.add(containingFile, deps)` 호출: `:318` — Map의 각 엔트리에 대해 `referencedFileTracker.add(containingFile, deps)` 호출. `FileReferenceTracker.add()` 시그니처(`file-reference-tracker.ts:22`)와 일치
- null guard 존재: `:316` — `pluginOptions.stylesheetDependencies != null` 체크

### onStart — stylesheetErrors → esbuild errors 변환

- 변환 코드가 additionalResults 에러 수집 후에 위치: `esbuild-angular-compiler-plugin.ts:329-334` — `additionalResults` 루프(`:322-327`) 후에 위치
- `{ text: errText, location: null }` 형식으로 push: `:332` — `errors.push({ text: errText, location: null })`. esbuild `PartialMessage` 형식에 부합
- null guard 존재: `:330` — `pluginOptions.stylesheetErrors != null` 체크
- 빈 배열 시 push 없음: `for...of` 루프이므로 빈 배열일 때 자연스럽게 0회 실행

### 증분 빌드 전이적 재컴파일 경로

- `referencedFileTracker.update(sourceFileCache.modifiedFiles)` 호출: `:231-233` — 증분 빌드 경로에서 `referencedFileTracker.update()`가 호출됨. Feature 2.1에서 등록한 SCSS 의존성이 여기서 전이적으로 확장됨
- 확장된 파일이 `sourceFileCache.invalidate()`에 전달됨: `:234` — `sourceFileCache.invalidate(expandedModifiedFiles)`. SCSS 의존성 파일 변경 시 해당 스타일시트 파일도 무효화되어 Angular compiler가 컴포넌트를 재컴파일
