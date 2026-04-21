# esbuild Angular Compiler Plugin — LLM 검증

## 검증 항목

- **JavaScriptTransformer 초기화**: `esbuild-angular-compiler-plugin.ts:170-181` — `@angular/build/private`에서 import한 `JavaScriptTransformer`를 `{ sourcemap, thirdPartySourcemaps, advancedOptimizations, jit }` 옵션과 `maxWorkers`, `cacheStore?.createCache("jstransformer")`로 초기화. jit은 `includeTestMetadata`에 매핑됨.

- **AngularCompiler 생성 시 transformStylesheet 콜백 전달**: `esbuild-angular-compiler-plugin.ts:222-229` — `AngularCompiler` 생성자에 `pluginOptions.transformStylesheet`를 직접 전달. 미제공 시 undefined로 전달되어 AngularCompiler에서 무시됨.

- **AngularCompiler 생성 시 externalStylesheets 전달**: `esbuild-angular-compiler-plugin.ts:228` — `pluginOptions.externalStylesheets`가 AngularCompiler 옵션에 전달됨.

- **첫 빌드 시 tsconfig 파싱 → AngularCompiler 생성 → initialize()**: `esbuild-angular-compiler-plugin.ts:214-231` — `angularCompiler == null` 조건에서 `parseTsconfigFile()` → `new AngularCompiler()` → `initialize()` 순서로 호출. compilerOptionsTransformer도 전달됨.

- **emitAffectedFiles → typeScriptFileCache 저장**: `esbuild-angular-compiler-plugin.ts:235-238` — emit 결과를 `path.normalize(filename)` 키로 저장. 원본 compiler-plugin.js와 동일한 패턴.

- **onDispose에서 리소스 정리**: `esbuild-angular-compiler-plugin.ts:295-299` — `angularCompiler = undefined`, `javascriptTransformer.close()`, `cacheStore?.close()` 호출. void로 fire-and-forget 처리 (원본과 동일).

- **LMDB 캐시 초기화 실패 시 graceful degradation**: `esbuild-angular-compiler-plugin.ts:160-168` — try-catch로 감싸고 logger.warn 후 cacheStore = undefined 유지. JavaScriptTransformer에 cache 없이 초기화됨.

- **onEnd에서 additionalResults 병합**: `esbuild-angular-compiler-plugin.ts:282-292` — outputFiles push + metafile Object.assign. result.outputFiles가 undefined일 수 있으므로 optional chaining 사용.

- **onStart 에러 처리**: `esbuild-angular-compiler-plugin.ts:262-274` — catch에서 "Angular compilation failed." 에러 메시지 + stack trace를 notes에 포함. hasCompilationErrors = true 설정.
