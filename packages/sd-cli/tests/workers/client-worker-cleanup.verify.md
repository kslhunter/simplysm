# Feature 3.1 client.worker.ts 호출부 업데이트 — LLM 검증

## 검증 항목

- [x] resolvePackageInfo에서 tsconfigPath 반환 제거: 반환 타입이 `{ pkgName: string }`으로 변경됨. 함수 내부에서 `tsconfigPath` 변수 선언 및 계산이 제거됨. 모든 호출부(startWatch:199, startLegacyWatch:266, build:396)에서 `{ pkgName }`으로만 구조분해.
- [x] startWatch에서 제거된 옵션 미전달: `createClientViteConfig` 호출에서 `tsconfigPath`, `browserslist`, `postCssPlugins`, `legacyModule`, `enableLint` 모두 제거됨.
- [x] startLegacyWatch에서 제거된 옵션 미전달: 동일하게 5개 옵션 모두 제거됨.
- [x] build에서 제거된 옵션 미전달: 동일하게 5개 옵션 모두 제거됨.
