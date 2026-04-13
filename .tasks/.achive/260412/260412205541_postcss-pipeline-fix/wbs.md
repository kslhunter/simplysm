# WBS: sd-cli Client 빌드 PostCSS 파이프라인 수정

## 프로젝트 개요

- **배경:** sd-cli의 client 빌드에서 PostCSS가 일부 CSS에 적용되지 않는 결함 발견. Angular library에서 빌드된 .js 파일의 inline CSS와 side-effect SCSS import에 PostCSS가 누락되어, vendor prefix 등 브라우저 호환성 처리가 빠지는 문제.
- **환경:** simplysm 모노레포 내 `packages/sd-cli` 패키지. esbuild + `@angular/build`의 `createCompilerPlugin` 기반 client 빌드 파이프라인.
- **전제조건:** 없음
- **기술적 제약:**
  - `@angular/build`의 `createCompilerPlugin`은 `.js` 파일에 대해 `JavaScriptTransformer`만 실행하며, inline CSS에 PostCSS를 적용하는 옵션이 없음 (확인 완료: `@angular/build` 소스 분석)
  - JS inline CSS 추출은 정규식이 아닌 AST 기반으로 수행해야 함 (사용자 지시)
- **참조 자료:**
  - `packages/sd-cli/src/esbuild/esbuild-client-config.ts` — client esbuild context 생성, `postcssConfiguration` 전달 지점
  - `packages/sd-cli/src/esbuild/esbuild-scss-plugin.ts` — side-effect SCSS 처리, PostCSS 미적용 현황
  - `packages/sd-cli/src/angular/client-transform-stylesheet.ts` — client용 SCSS+PostCSS 콜백 (AngularBuildPipeline 전용)
  - `packages/sd-cli/src/angular/angular-build-pipeline.ts` — library/client 모드별 transformStylesheet 선택
  - `packages/sd-cli/src/workers/client.worker.ts` — client worker, postcssPlugins 전달 경로

## Impact Mapping

- **Goal:** Client 빌드 시 모든 CSS에 PostCSS가 적용되어 브라우저 호환성 보장
  - **Actor:** Client 앱 최종 사용자 (브라우저)
    - **Impact:** PostCSS 플러그인(autoprefixer 등)이 모든 CSS에 적용되어 구형 브라우저에서도 정상 렌더링
      - **Deliverable:** sd-cli PostCSS 파이프라인 통합 수정

## Feature Breakdown

### Epic 1. PostCSS 파이프라인 통합

#### [x] Feature 1.1 esbuild onEnd PostCSS 플러그인

**의존성:** 없음
**Feature 문서:** [1.1-esbuild-onend-postcss-plugin.md](./1.1-esbuild-onend-postcss-plugin.md)

**범위:**

- 새 esbuild 플러그인 모듈 생성 (onEnd 기반)
- .css 출력 파일: 전체 내용에 PostCSS 적용
- .js 출력 파일: AST 파서로 Angular component의 `styles: [...]` 배열 내 문자열 리터럴을 추출하여 PostCSS 적용 후 재주입
- PostCSS 플러그인 배열을 옵션으로 받아 `postcss(plugins).process()` 수행
- `styles` 문자열이 포함되지 않은 .js 파일은 AST 파싱 생략 (성능 최적화)

**경계:**

- esbuild-scss-plugin의 PostCSS 지원은 이 Feature에서 다루지 않음 (Feature 1.2)
- esbuild-client-config의 설정 변경은 이 Feature에서 다루지 않음 (Feature 1.2)
- sourcemap 갱신은 범위 외 (기존 onEnd 플러그인 `sd-legacy-strip-dynamic-import`도 sourcemap 미갱신)

**설계 결정:**

- D1: AST 파서 → acorn + acorn-walk (경량, ECMAScript 표준 준수)
- D2: styles 매칭 → 엄격 매칭 (ɵɵdefineComponent 호출 내부만, 오탐 방지)
- D3: PostCSS 실패 처리 → 빌드 에러로 보고 (result.errors 추가)
- 신규 의존성: `acorn`, `acorn-walk` (sd-cli의 package.json에 추가 필요)

**근거:**

- 코드 분석: `@angular/build`의 `createCompilerPlugin`이 `.js` 파일의 inline CSS에 PostCSS를 적용하지 않음 확인
- 사용자 요구: "library에서 온 .js에 있는 inline scss까지 모두 PostCSS 대상으로 포함"
- 사용자 지시: "AST를 쓰던지 해야지" (정규식 기반 반대)

#### [x] Feature 1.2 client 빌드 PostCSS 설정 통합

**의존성:** Feature 1.1
**Feature 문서:** [1.2-client-build-postcss-config-integration.md](./1.2-client-build-postcss-config-integration.md)

**범위:**

- `esbuild-client-config.ts`에서 `postcssConfiguration: undefined`로 변경 (createCompilerPlugin 내부 PostCSS 비활성화)
- `esbuild-scss-plugin.ts`에 PostCSS 옵션(`postcssPlugins`) 추가, SCSS → CSS 후 PostCSS 적용
- `esbuild-client-config.ts`에서 Feature 1.1의 onEnd 플러그인을 plugins 배열에 등록 (`angularPlugin` 뒤, `sd-legacy-strip-dynamic-import` 앞)
- `esbuild-client-config.ts`에서 수정된 `createScssPlugin`에 postcssPlugins 전달
- `postcssConfigPath` 옵션 제거 (postcssConfiguration 제거로 유일한 소비처 소멸)
- PostCSS 플러그인 튜플 → 인스턴스 로딩 (`createRequire(pkgDir)` 기반)

**경계:**

- library 빌드(ngtsc-build.worker)는 변경하지 않음 (기존대로 PostCSS 미수행)
- `client-transform-stylesheet.ts`는 AngularBuildPipeline 전용이므로 변경하지 않음
- `sd-config.types.ts`의 `SdBrowserSupportConfig` 인터페이스는 변경 없음

**설계 결정:**

- D1: 플러그인 로딩 위치 → `createClientEsbuildContext` 내부 (async 함수, client.worker.ts 변경 최소화)
- D2: 플러그인 resolve 방식 → `createRequire(pkgDir/package.json)` (소비 프로젝트 node_modules에서 resolve)
- D3: postcssConfigPath → 제거 (유일한 소비처 소멸, options.pkgDir 대체)
- D4: onEnd 등록 조건 → postcssPlugins가 있고 비어있지 않을 때만

**근거:**

- 사용자 선택: "통합 onEnd 처리" 방식 (postcssConfiguration 비활성화 + onEnd에서 모든 CSS 통합 처리)
- 코드 분석: `esbuild-scss-plugin.ts`의 `compileScssFileAsync` 호출 후 PostCSS 없음 확인
- 코드 분석: `esbuild-client-config.ts:94-101`의 postcssConfiguration이 createCompilerPlugin에만 전달됨

## 제외 사항

- library 빌드 변경: library 빌드는 PostCSS를 수행하지 않는 것이 의도된 설계 (사용자 명시)
- `client-transform-stylesheet.ts` 변경: AngularBuildPipeline(ngtsc-build.worker)에서만 사용, esbuild-client-config 경로와 무관 (범위 외)
- Vite 관련 변경: 현재 client 빌드는 esbuild 기반, Vite 관련 코드는 별도 경로 (범위 외)
