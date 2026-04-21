# onLoad 훅 — LLM 검증

## 검증 항목

- TS onLoad 훅이 `/\.[cm]?[jt]sx?$/` 필터로 등록된다: :517 `build.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, ...)`
- JS onLoad 훅이 `/\.[cm]?js$/` 필터로 등록된다: :584 `build.onLoad({ filter: /\.[cm]?js$/ }, ...)`
- TS onLoad: shouldTsIgnoreJs=true이고 JS 파일이면 undefined 반환: :522 `if (shouldTsIgnoreJs && isJS) return undefined`
- TS onLoad: 캐시 미스 + hasCompilationErrors이면 `{ contents: '', loader: 'js' }` 반환: :530
- TS onLoad: 캐시 미스 + allowJs + JS이면 undefined 반환: :535
- TS onLoad: 캐시 미스 + Angular 데코레이터 없으면 warning 반환: :541-547
- TS onLoad: 캐시 미스 + Angular 데코레이터 있으면 error 반환: :550-552
- TS onLoad: string 캐시 + (useTypeScriptTranspilation || isJS)이면 transformData 호출 → Uint8Array 재캐싱: :556-565
- TS onLoad: Uint8Array 캐시이면 재변환 없이 그대로 반환: :556 조건 `typeof contents === "string"` — Uint8Array는 조건 불일치로 통과
- TS onLoad: loader 결정 — (useTypeScriptTranspilation || isJS) → 'js', .tsx → 'tsx', 기타 → 'ts': :569-574
- JS onLoad: createCachedLoad(loadResultCache, callback)으로 래핑: :586
- JS onLoad: transformFile(request, false, sideEffects) 호출: :589
- hasSideEffects: advancedOptimizations=false → undefined 반환: :292-293
- hasSideEffects: advancedOptimizations=true → build.resolve() 호출: :295-298
- shouldTsIgnoreJs: onStart에서 !compilerOptions.allowJs로 결정: :405
- useTypeScriptTranspilation: !isolatedModules || !!sourceMap || !!inlineSourceMap으로 결정: :406-407
- loadResultCache 옵션이 AngularCompilerPluginOptions에 추가됨: :33
