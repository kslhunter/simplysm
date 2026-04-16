# Web Worker 번들링 — LLM 검증

## 검증 항목

### bundleWebWorker 함수

- [x] buildSync 옵션: `esbuild-angular-compiler-plugin.ts:165-177` — platform: "browser", write: false, bundle: true, metafile: true, format: "esm", entryNames: "worker-[hash]", plugins: undefined, supported: undefined 모두 확인
- [x] sourcemap 전달: `esbuild-angular-compiler-plugin.ts:174` — `sourcemap` 파라미터 직접 전달
- [x] initialOptions spread: `esbuild-angular-compiler-plugin.ts:165` — `...build.initialOptions`로 target/absWorkingDir/outdir 전달
- [x] catch — errors/warnings 있으면 반환: `esbuild-angular-compiler-plugin.ts:178-186` — `"errors" in error && "warnings" in error` 확인 후 `error as esbuild.BuildResult` 반환
- [x] catch — 없으면 re-throw: `esbuild-angular-compiler-plugin.ts:187` — `throw error`

### processWebWorker 콜백

- [x] workerFile resolve: `esbuild-angular-compiler-plugin.ts:346` — `path.join(path.dirname(containingFile), workerFile)`
- [x] 성공 — additionalResults 저장: `esbuild-angular-compiler-plugin.ts:365-368` — `additionalResults.set(fullWorkerPath, { outputFiles, metafile })`
- [x] 성공 — FileReferenceTracker 등록: `esbuild-angular-compiler-plugin.ts:371-376` — `metafile.inputs` 키를 `path.join(cwd, input)`으로 변환하여 등록
- [x] 성공 — 반환값: `esbuild-angular-compiler-plugin.ts:379-388` — `/^worker-[A-Z0-9]{8}\.[cm]?js$/` 패턴으로 검색, `path.relative(outdir, ...)` + `replaceAll("\\", "/")` forward slash 반환
- [x] 에러 — errors push: `esbuild-angular-compiler-plugin.ts:352` — `errors.push(...workerResult.errors)`
- [x] 에러 — warnings push: `esbuild-angular-compiler-plugin.ts:349` — `warnings.push(...workerResult.warnings)` (성공/실패 공통 실행)
- [x] 에러 — FileReferenceTracker 등록: `esbuild-angular-compiler-plugin.ts:354-359` — `location?.file` 필터 후 `path.join(cwd, f)` 변환
- [x] 에러 — additionalResults 저장: `esbuild-angular-compiler-plugin.ts:361` — `{ errors: workerResult.errors }`
- [x] 에러 — 원본 반환: `esbuild-angular-compiler-plugin.ts:362` — `return workerFile`

### Plugin 통합

- [x] import: `esbuild-angular-compiler-plugin.ts:14` — `import { createWorkerTransformer } from "../angular/web-worker-transformer.js"`
- [x] transformer 생성: `esbuild-angular-compiler-plugin.ts:392` — `createWorkerTransformer(processWebWorker)`
- [x] emitAffectedFiles 전달: `esbuild-angular-compiler-plugin.ts:393-395` — `{ additionalTransformers: { before: [workerTransformer] } }`
- [x] 클로저 접근: `esbuild-angular-compiler-plugin.ts:344-389` — onStart 내부에서 생성, `errors`/`warnings`/`additionalResults`/`referencedFileTracker`/`cwd`/`build` 접근 가능
- [x] onEnd 병합: `esbuild-angular-compiler-plugin.ts:449-460` — additionalResults 순회에서 worker 결과 포함
