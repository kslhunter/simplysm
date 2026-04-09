# Feature 3.1 createClientViteConfig 옵션 정리 — LLM 검증

## 검증 항목

- [x] enableLint 옵션 제거: `CreateClientViteConfigOptions` 인터페이스에서 `enableLint` 필드가 완전히 제거됨. `vite-config.ts` 전체에서 `enableLint` 문자열 검색 결과 0건.
- [x] replaceDepDistPaths 계산 제거: `vite-config.ts` 전체에서 `replaceDepDistPaths` 문자열 검색 결과 0건. 기존 line 98-114의 계산 로직(fs.realpathSync, pathx.posix 사용)이 완전히 제거됨. `fs`와 `pathx` import도 함께 제거됨.
- [x] tsconfigPath, browserslist, postCssPlugins, legacyModule은 인터페이스 옵션이 아닌 함수 내부 로컬 변수로만 존재: 모두 `loadSdConfig()` 결과에서 추출하거나 `pkgDir`에서 derive됨.
