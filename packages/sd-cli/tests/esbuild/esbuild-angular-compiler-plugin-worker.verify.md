# Web Worker 통합 (Feature 1.2) — LLM 검증

## 검증 항목

### 제거된 코드

- [x] `createWorkerTransformer` import가 제거됨: `esbuild-angular-compiler-plugin.ts`에 `web-worker-transformer.js`로부터의 import가 존재하지 않음
- [x] `AdditionalResult` 인터페이스 선언이 제거됨
- [x] `bundleWebWorker` 함수 및 `#region bundleWebWorker` 주석이 제거됨
- [x] `additionalResults` Map 선언이 제거됨
- [x] `createWebWorkerProcessor` 함수가 제거됨
- [x] onStart 내부의 `processWebWorker` + `workerTransformer` 생성 코드가 제거됨
- [x] `compileAsync` 호출에서 `additionalTransformers` 옵션이 제거됨
- [x] 증분 빌드 루프에서 `additionalResults.delete(file)` 호출이 제거됨

### 추가된 코드

- [x] `transformWorkerPatterns` import가 `./esbuild-worker-plugin`에서 추가됨 (같은 디렉토리, .js 확장자 미사용)
- [x] setup 스코프에 `workerResultsByContainingFile = new Map<string, { outputFiles?: esbuild.OutputFile[]; metafile?: esbuild.Metafile }>()` 선언이 존재함 (증분 빌드 시 변경되지 않은 Worker metafile 유지 목적)

### onStart — TS 파일 Worker 패턴 처리 (Rule 1)

- [x] 증분 빌드 시 `expandedModifiedFiles` 각 파일에 대해 `workerResultsByContainingFile.delete(file)` 호출 (선택적 제거)
- [x] `emitResults` 루프에서 각 파일에 대해 `transformWorkerPatterns(contents, normalized, build)` 호출
- [x] `workerResult != null`이면 `typeScriptFileCache.set(normalized, workerResult.contents)` 저장
- [x] `workerResult.errors`/`workerResult.warnings`를 onStart의 `errors`/`warnings` 배열에 push
- [x] `workerResult.workerMetafile != null`이면 `referencedFileTracker.add(normalized, Object.keys(workerResult.workerMetafile.inputs).map(input => path.join(cwd, input)))` 호출
- [x] `workerMetafile` 또는 `workerOutputFiles`가 있으면 `workerResultsByContainingFile.set(normalized, { outputFiles, metafile })` 저장
- [x] `workerResult == null`이면 기존처럼 `typeScriptFileCache.set(normalized, contents)` 저장
- [x] Worker 번들 에러가 errors 배열에 포함되어 onStart 결과에 반영됨 (Scenario: 에러 전파)

### JS onLoad — .js 파일 Worker 패턴 처리 (Rule 2)

- [x] `createCachedLoad` 콜백에서 `javascriptTransformer.transformFile` 호출 후 결과를 `TextDecoder`로 문자열로 변환
- [x] 변환된 문자열에 `transformWorkerPatterns(textContents, request, build)` 적용
- [x] `workerResult != null`일 때:
  - `workerResult.workerMetafile`이 있으면 `referencedFileTracker.add` 호출
  - `workerMetafile` 또는 `workerOutputFiles`가 있으면 `workerResultsByContainingFile.set(request, { outputFiles, metafile })` 저장
  - 반환: `{ contents, loader: "js", resolveDir, errors (>0일때), warnings (>0일때) }` — TS/JS 에러 처리 일관성 확보 (L2 리뷰 반영)
- [x] `workerResult == null`일 때 기존과 동일한 `{ contents, loader: "js", resolveDir }` 반환

### onEnd — metafile 병합 (Rule 3)

- [x] onEnd에서 `workerResultsByContainingFile.values()` 순회
- [x] 각 항목의 `outputFiles`가 있으면 `result.outputFiles?.push(...outputFiles)`
- [x] 각 항목의 `metafile`이 있으면 `Object.assign(result.metafile.inputs, wr.metafile.inputs)` + `Object.assign(result.metafile.outputs, wr.metafile.outputs)`
- [x] onEnd에서 Map 전체 리셋 없음 — 증분 빌드에서 변경되지 않은 Worker 결과가 다음 빌드에서도 병합됨
- [x] 기존 `additionalResults` 순회 루프가 제거됨

### client config 무변경 (Rule 6)

- [x] `esbuild-client-config.ts`에 Worker 플러그인 추가 코드가 존재하지 않음 (plugins 배열에 `createWorkerBundlePlugin` 또는 `sd-worker-bundle` 미포함)
- [x] `esbuild-client-config.ts` 파일 자체가 Feature 1.2로 인해 변경되지 않음 (git diff 기준)

### 회귀 방지

- [x] `pnpm test --run packages/sd-cli/tests/esbuild/esbuild-angular-compiler-plugin.spec.ts` 통과 (기존 plugin 구조 테스트)
- [x] `pnpm test --run packages/sd-cli/tests/esbuild/esbuild-worker-plugin.spec.ts` 통과 (Feature 1.1 Unit 테스트)
- [x] `pnpm test --run packages/sd-cli/tests/esbuild/esbuild-worker-plugin.acc.spec.ts` 통과 (Feature 1.1 Acceptance 테스트)
