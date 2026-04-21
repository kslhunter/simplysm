# esbuild-pwa — LLM 검증

## 검증 항목

- augmentAppWithServiceWorker 호출 인자가 정확한가: `esbuild-pwa.ts:108-113` — `(options.pkgDir, options.cwd, options.outdir, options.baseHref)` 순서로 호출 확인
- 기본 ngsw-config.json에 $schema, index, assetGroups(app, assets)가 포함되는가: `esbuild-pwa.ts:83-104` — `$schema`, `index: "/index.html"`, `assetGroups: [{name: "app"}, {name: "assets"}]` 확인
- 등록 스크립트에서 ngsw-worker.js를 등록하는가: `esbuild-pwa.ts:119` — `register("ngsw-worker.js")` 확인. `sw.js` 참조 없음
- SdPwaConfig.workbox 필드를 참조하지 않는가: grep 결과 "workbox" 0건 확인. D4 결정 준수
- generatePwaIcons 호출 결과를 dist/icons/로 복사하는 로직이 있는가: `esbuild-pwa.ts:51-58` — `srcIconsDir(public/icons/)` → `dstIconsDir(outdir/icons/)` copyFileSync 로직 확인
