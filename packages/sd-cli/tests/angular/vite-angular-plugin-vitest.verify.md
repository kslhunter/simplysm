# Slice 2: Vite 제거 + vite-angular-plugin 축소 — LLM 검증

## 검증 항목

- vite-config.ts 삭제됨: `ls packages/sd-cli/src/utils/vite-config.ts` → 파일 없음 확인
- vite-scope-watch-plugin.ts 삭제됨: `ls packages/sd-cli/src/utils/vite-scope-watch-plugin.ts` → 파일 없음 확인
- vite-postcss-inline-plugin.ts 삭제됨: `ls packages/sd-cli/src/angular/vite-postcss-inline-plugin.ts` → 파일 없음 확인
- vite-pwa-plugin.ts 삭제됨: `ls packages/sd-cli/src/utils/vite-pwa-plugin.ts` → 파일 없음 확인
- vite-angular-plugin.ts에서 config() 훅 유지: config()는 isDev, pkgConfig, resolvedPkgDir 초기화에 필수. Vitest가 Vite plugin lifecycle을 호출하므로 유지. 단, optimizeDeps/define 반환값 제거됨
- vite-angular-plugin.ts에서 configResolved() 훅 유지: enableSourcemap 설정에 필요. 단, prebundleTransformer 생성 제거됨
- handleHotUpdate() 제거됨: HMR 배칭(pendingHmrFiles, hmrBatchTimer, processHmrBatch) 모두 제거됨
- configureServer() 제거됨: devServer, isDevServer, angularComponentMiddleware 모두 제거됨
- onBuildStart/onBuild 콜백 제거됨: SdAngularPluginOptions에서 onBuildStart, onBuild 필드 삭제됨. buildStart()에서 options.onBuild 호출 제거됨
- resolveReplaceDeps() 제거됨: scope watch 관련 replaceDepDistPaths, resolveReplaceDepEntries import 모두 제거됨
- watchChange(id) 유지됨: pendingWatchChanges에 파일 경로 수집. Vitest watch 모드에서 캐시 무효화에 사용
- buildStart() 유지됨: tsconfig 파싱, AngularSourceFileCache 생성/재사용, AngularBuildPipeline 초기화, 전체/증분 컴파일 수행. enableHmr: false로 고정 (Vitest에서 HMR 불필요)
- transform() 유지됨: .ts 파일에 대해 Pipeline emit JS 반환 + JavaScriptTransformer 적용. query param 제거 및 인라인 소스맵 분리 로직 유지
- buildEnd() 간소화됨: isDev 분기 제거. 항상 jsTransformer.close() + pipeline 해제. prebundleTransformer 제거
- Vite 타입 import 축소: `ModuleNode`, `ViteDevServer` import 제거됨. `Plugin` 타입만 유지
- 미사용 import 제거: `createHash`, `fsp`, `fs`, `IncomingMessage`, `ServerResponse`, `SdConfig`, `resolveReplaceDepEntries` 제거됨
