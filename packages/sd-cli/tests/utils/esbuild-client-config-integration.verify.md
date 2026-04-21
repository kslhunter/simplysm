# Feature 3.1 esbuild-client-config.ts 통합 — LLM 검증

## 검증 항목

- `@angular/build/private`에서 `createCompilerPlugin`, `SourceFileCache`, `CompilerPluginOptions`, `BundleStylesheetOptions` import가 없다: grep 결과 `@angular/build/private` 매치 없음
- `createAngularCompilerPlugin`이 `./esbuild-angular-compiler-plugin.js`에서 import되어 있다: line 10에서 import, line 119에서 호출 확인
- `ClientSourceFileCache`가 `AngularSourceFileCache`를 확장하고 `typeScriptFileCache`, `loadResultCache` 프로퍼티를 가진다: line 46-49에서 `extends AngularSourceFileCache` + 두 프로퍼티 확인
- `ClientEsbuildResult.sourceFileCache` 타입이 `ClientSourceFileCache`이다: line 53 확인
- `client.worker.ts`의 `sourceFileCache.loadResultCache.watchFiles`, `sourceFileCache.typeScriptFileCache.keys()`, `sourceFileCache.invalidate()` 접근이 새 구조와 타입 호환된다: typecheck 0 에러로 타입 호환성 확인됨
