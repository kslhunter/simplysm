# Feature 1.2 client 빌드 PostCSS 설정 통합 — LLM 검증

## 검증 항목

- [x] postcssConfigPath가 CreateClientEsbuildOptions 인터페이스에서 제거됨: `esbuild-client-config.ts`에서 `postcssConfigPath` 검색 결과 없음 (No matches found). `client.worker.ts`에서도 2곳 모두 제거 확인.
- [x] createScssPlugin에 로딩된 PostCSS 인스턴스가 전달됨: `esbuild-client-config.ts:118`에서 `postcssPlugins: loadedPostcssPlugins`로 `createScssPlugin`에 전달 확인.
