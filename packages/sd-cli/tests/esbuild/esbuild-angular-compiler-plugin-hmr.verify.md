# esbuild Angular Compiler Plugin — 증분 빌드 + HMR — LLM 검증

## 검증 항목

- **증분 빌드 조건 판단**: `esbuild-angular-compiler-plugin.ts:200` — `angularCompiler != null && sourceFileCache != null && sourceFileCache.modifiedFiles.size > 0`으로 증분 빌드 감지. 첫 빌드는 `angularCompiler == null` 경로로 진입.

- **staleSourceFiles 캡처 타이밍**: `esbuild-angular-compiler-plugin.ts:208-219` — `invalidate()` 호출 전에 이전 `ts.Program`에서 stale source files를 캡처. `invalidate` 후에는 캐시에서 삭제되므로 순서가 중요.

- **FileReferenceTracker.update → sourceFileCache.invalidate**: `esbuild-angular-compiler-plugin.ts:221-224` — `referencedFileTracker.update()`로 전이적 의존성 확장 후 `invalidate()` 호출. 확장된 파일 집합이 전달됨.

- **stale additionalResults 제거**: `esbuild-angular-compiler-plugin.ts:226-229` — expandedModifiedFiles의 각 파일에 대해 `additionalResults.delete()` 호출.

- **HMR 활성화 조건**: `esbuild-angular-compiler-plugin.ts:204-206` — `templateUpdates != null && modifiedFiles.size <= 32`. 32개 초과 시 HMR 건너뜀.

- **collectHmrCandidates 호출**: `esbuild-angular-compiler-plugin.ts:235-239` — `ngtscProgram`과 `staleSourceFiles`를 전달. `sourceFileCache.modifiedFiles`(확장 전 원본)을 대상으로 분석.

- **emitHmrUpdateModule 호출 및 null 처리**: `esbuild-angular-compiler-plugin.ts:259-264` — `emitHmrUpdateModule`이 null/undefined 반환 시 break (templateUpdates 전파 중단). NgCompiler API를 Record 캐스팅으로 접근 (타입이 private이므로).

- **templateUpdates Map 전파**: `esbuild-angular-compiler-plugin.ts:266` — `pluginOptions.templateUpdates!.set(updateId, updateText)`로 외부 Map에 직접 기록.

- **updateId 형식**: `esbuild-angular-compiler-plugin.ts:256-258` — `encodeURIComponent("{relativePath}@{className}")`. relativePath는 hostDir 기준 상대경로, 백슬래시를 슬래시로 변환.

- **hmr-candidates.ts 구조**: `hmr-candidates.ts` — `collectHmrCandidates` 함수가 원본 `hmr-candidates.js`의 로직을 TypeScript로 이식. `analyzeFileUpdates`, `analyzeMetaUpdates`, `equalRangeText` 헬퍼 포함. SUPPORTED_FIELD_NAMES = {template, templateUrl, styles, styleUrl, stylesUrl}.
