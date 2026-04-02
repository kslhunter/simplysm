# Angular Linker Transform — LLM 검증

## 검증 항목

- [x] .mjs 파일이 transform 훅을 통과하는 분기 존재: `vite-angular-plugin.ts:318` — `!id.endsWith(".mjs")` 조건으로 .mjs 파일이 Phase 2로 진행됨 확인
- [x] .js 파일이 transform 훅을 통과하는 분기 존재: `vite-angular-plugin.ts:318` — `!id.endsWith(".js")` 조건으로 .js 파일이 Phase 2로 진행됨 확인
- [x] .ts 파일은 emittedFiles 조회 후 Phase 2로 진행: `vite-angular-plugin.ts:313-317` — emittedFiles.get() 성공 시 code 교체 후 Phase 2 도달
- [x] .ts 파일이 emittedFiles에 없으면 early return: `vite-angular-plugin.ts:316` — `if (emittedContent == null) return;`
- [x] 비대상 파일(.css, .html 등)은 early return: `vite-angular-plugin.ts:318-320` — else if 분기에서 return
- [x] Phase 2에서 skipLinker=false로 JavaScriptTransformer.transformData 호출: `vite-angular-plugin.ts:323` — 세 번째 인자 `false`
- [x] vite-config.ts에 optimizeDeps.exclude 설정 없음: `vite-config.ts` 전체에서 `optimizeDeps` 키워드 미사용 확인
- [x] jsTransformer null 시 안전한 early return: `vite-angular-plugin.ts:308` — `if (jsTransformer == null) return;`
