# createClientEsbuildContext — LLM 검증

## Feature 1.1a 검증 항목

- [x] import 경로: `@angular/build/private`에서 `createCompilerPlugin`, `SourceFileCache`, `CompilerPluginOptions`, `BundleStylesheetOptions`를 정상 import — `private.d.ts` line 31-37에 모두 export 확인
- [x] `createCompilerPlugin`의 2-param 시그니처(private export wrapper)와 일치하는 호출 — `createCompilerPlugin(pluginOptions, styleOptions)` 2개 인자로 호출 (private.d.ts의 wrapper 시그니처와 일치)
- [x] `CompilerPluginOptions.sourcemap` 타입이 `boolean | 'external'` 범위 내 값 사용 — `isDev` (boolean)으로 전달, `true`/`false` 범위 내
- [x] `BundleStylesheetOptions.sourcemap` 타입이 `boolean | 'external' | 'inline' | 'linked'` 범위 내 값 사용 — `isDev ? "linked" : false` 범위 내
- [x] `sd-config.types.ts`의 `postCss.plugins` 타입이 Angular의 `PostcssConfiguration` 포맷과 일치 — `[string, (object | string)?][]` = Angular의 `[name: string, options?: object | string][]`
- [x] `onEnd` 플러그인이 esbuild Plugin 규격(`name` + `setup`)을 준수 — `{ name: "sd-on-end", setup(build) { build.onEnd(...) } }` 규격 충족
- [x] 패키지 루트 `index.ts`에서 신규 모듈 export 필요 여부 — 불필요. 기존 `esbuild-config.ts`도 내부 유틸로 export 안 함. `sd-config.types.ts`만 export 중

## Feature 1.1b-2 검증 항목

- [x] `browserslist-to-esbuild` import 정상 — `import browserslistToEsbuild from "browserslist-to-esbuild"` 추가. `vite-config.ts:5`와 동일한 패턴
- [x] `browserslistToEsbuild` 반환값이 esbuild target 및 BundleStylesheetOptions.target에 동시 적용 — `esbuildTarget` 변수로 통합하여 두 곳에 사용 (line 51-56, 82, 122)
- [x] 에셋 복사: `copyPublicFiles(pkgDir, false)` 시그니처가 build 모드 호출 가능 — `copy-public.ts:15` 시그니처 `(pkgDir: string, includeDev: boolean): Promise<void>` 확인. build 모드에서 `false` 전달 적합
- [x] 에셋 감시: `watchPublicFiles(pkgDir, true)` 시그니처가 dev 모드 호출 가능 — `copy-public.ts:58` 시그니처 `(pkgDir: string, includeDev: boolean): Promise<FsWatcher | undefined>` 확인. dev 모드에서 `true` 전달 적합
- [x] 에셋 복사 함수는 `createClientEsbuildContext` 외부 호출자 담당 (설계 결정 D4) — `createClientEsbuildContext` 내부에 `copyPublicFiles`/`watchPublicFiles` 호출 없음 확인. 실제 호출 통합은 Feature 3.1에서 수행

## Feature 1.1b-1 검증 항목

- [x] tsconfig 옵션이 CompilerPluginOptions와 esbuild context에 동일 기본값 사용 — 둘 다 `options.tsconfig ?? path.join(options.pkgDir, "tsconfig.json")`. CompilerPluginOptions(line 65)와 esbuild context(line 151)에서 동일 패턴
- [x] esbuild tsconfig 옵션이 서버 빌드 패턴(D1)과 일치 — `esbuild-config.ts:94` `tsconfig: path.join(options.pkgDir, "tsconfig.json")`과 동일. 클라이언트는 추가로 `options.tsconfig` 커스텀 경로 지원 (기존 인터페이스에 이미 존재)
- [x] scssPlugin loadPaths가 buildScssLoadPaths 패턴과 일치 — `ngtsc-build-core.ts:91-96`의 `[pkgDir/scss, cwd/node_modules]`와 `esbuild-client-config.ts:105-108`의 `[options.pkgDir/scss, options.cwd/node_modules]` 동일
- [x] plugins 배열 순서가 구현계획과 일치 — `[angularPlugin, scssPlugin, ...customPlugins, ...onEndPlugin]` (line 153-169)
