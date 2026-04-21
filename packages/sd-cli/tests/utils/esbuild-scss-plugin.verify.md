# createScssPlugin — LLM 검증

## 검증 항목

- createCompilerPlugin 컴포넌트 스타일과 비충돌: `createCompilerPlugin`은 `BundleStylesheetOptions`를 받아 컴포넌트 `styleUrls`를 TypeScript 변환 과정에서 내부 처리한다. 이들은 esbuild의 일반 `onLoad` 경로를 타지 않으므로, `sd-scss` 플러그인의 `onLoad({ filter: /\.scss$/ })` 콜백은 side-effect `import "./global.scss"` 같은 일반 import만 인터셉트한다. 충돌 없음 확인.
- onLoad filter 정확성: `/\.scss$/` 정규식이 `.scss` 파일만 매칭 — `.css`, `.scss.ts` 등은 매칭하지 않음. 단위 테스트(`esbuild-scss-plugin.spec.ts`)에서 검증 완료.
- sass 라인 번호 변환: sass `span.start.line`은 0-based, esbuild `location.line`은 1-based. `line + 1` 변환 적용 확인 (`esbuild-scss-plugin.ts:31`).
- fileURLToPath import 정상: `url` 모듈에서 import. `scss-compiler.ts`의 `pathToFileURL`과 동일 모듈.
