# WBS

## Impact Mapping

- **Goal:** 레이아웃 스타일 사용법을 directive(attribute selector) 기반으로 통일하여, 코드 일관성 확보 및 오타 시 컴파일 에러 보장
  - **Actor:** simplysm 모노레포 개발자
    - **Impact:** 레이아웃 스타일 작성 시 directive만 사용하게 되어, class 직접 사용 경로 없이 일관된 코드 작성
      - **Deliverable:** sd-cli side-effect SCSS import 지원 + angular 패키지 SCSS/directive 전환

## Feature Breakdown

> 각 Feature의 범위 힌트(`-` 불릿)는 대표 예시이며 전체 목록이 아니다. 정식 분해는 `/sd-dev-spec`에서 수행한다.

### Epic 1. sd-cli NgtscEngine - Side-effect SCSS Import 지원

- [x] Feature 1.1 빌드 시 side-effect SCSS → CSS 컴파일 및 출력
  - emit된 JS에서 `.scss` side-effect import 감지
  - SCSS → CSS 컴파일 후 dist에 .css 출력
  - JS의 import 경로를 `.scss` → `.css`로 변환
  - package.json sideEffects 설정

- [x] Feature 1.2 Watch 모드에서 side-effect SCSS 변경 감지 및 incremental 재빌드
  - side-effect SCSS 파일 감시 대상 등록
  - SCSS 변경 시 CSS 재컴파일 + dist 갱신
  - SCSS dependency 추적 (기존 scssDependencies 메커니즘 확장)

- [x] Feature 1.3 Client dev 모드에서 side-effect CSS의 HMR 및 PostCSS 적용 검증/수정
  - 라이브러리 dist의 `.css` 변경 시 Client HMR 동작 확인
  - side-effect import된 CSS에 PostCSS 적용 확인
  - `sdAngularPlugin` handleHotUpdate의 `.css` 필터링 이슈 대응

### ~~Epic 2. angular 패키지 - Attribute Selector 기반 SCSS 전환~~ (취소)

> 취소 사유: directive가 host class를 설정하는 방식에서 attribute selector로 전환하면, 다른 컴포넌트의 `host: { class: "flex-row" }` 등이 깨진다. directive 자체가 불필요한 추상화로 판단하여 Epic 취소. 레이아웃 directive 제거는 별도 Feature로 진행: `.tasks/260329160621_remove-layout-directives/`

## 참조 자료

### 업계 표준: Library SCSS 처리

- Library 빌드 시 SCSS → CSS로 컴파일하여 dist에 출력하는 것이 업계 표준 (접근 A)
- Angular Material, PrimeNG, Shopify Polaris 등이 이 방식 사용
- 소비자에게 SCSS 컴파일러 의존성을 강제하지 않기 위함

### 대상 SCSS 파일 (6개)

- `_card.scss`: display, background, border-radius, elevation mixin, @keyframes 애니메이션, :hover/:focus-within pseudo
- `_flex.scss`: display flex/inline-flex, flex-direction, flex-wrap, flex-auto/fill/min
- `_form-box.scss`: display flex, flex-direction, 자식 selector(> div > label), @media(pointer: coarse)
- `_form-table.scss`: border-collapse, 자식 selector(> tr > th), .form-table-header
- `_grid.scss`: display grid, grid-template-columns, 반응형 @media(max-width) 쿼리, @for loop
- `_table.scss`: border 처리, 자식 selector(> tbody > tr > td), modifier 클래스(table-inset, table-inline, table-bd-v, table-bd-h)

### 참조 파일

- `packages/sd-cli/src/utils/ngtsc-build-core.ts` — NgtscEngine 빌드/watch 핵심 로직. `transformResource`(줄 131~154)는 @Component styles만 처리, `compileGlobalScss`(줄 205~222)는 글로벌 styles.scss만 처리. side-effect import는 미처리
- `packages/sd-cli/src/utils/scss-compiler.ts` — SCSS 컴파일 유틸리티. compileScssFile/compileScssString 함수
- `packages/sd-cli/src/angular/vite-angular-plugin.ts` — Client Angular Vite 플러그인. handleHotUpdate(줄 87~93)에서 .css 미포함 필터링 확인
- `packages/sd-cli/src/angular/vite-postcss-inline-plugin.ts` — 라이브러리 JS 내 @Component inline styles에 PostCSS 적용. side-effect CSS는 대상 아님
- `packages/sd-cli/src/utils/vite-scope-watch-plugin.ts` — 라이브러리 dist/ 변경 감시 → Client Vite HMR 전파
- `packages/sd-cli/src/utils/vite-config.ts` — Client Vite 설정. css.postcss(줄 127~131)로 외부 CSS에 PostCSS 적용
- `packages/sd-cli/src/angular/angular-facade.ts` — Client Angular 컴파일 Facade. transformStylesheet에서 SCSS 컴파일 + PostCSS 적용
- `packages/angular/src/ui/layout/` — 대상 directive 파일들 위치
- `packages/angular/scss/controls/` — 대상 SCSS 파일들 현재 위치
- `.tasks/260326183509_sd-cli-rebuild/wbs.md` — sd-cli v14 리빌드 WBS. 전체 빌드 엔진 아키텍처(NgtscEngine, ViteEngine, ServerEsbuildEngine) 확인

## 제외 사항

- 글로벌 `scss/styles.scss` → `dist/styles.css` 경로 변경 (IDE intellisense용으로 현행 유지)
- Client 빌드(ViteEngine) 내부 구조 변경 (Vite 기본 CSS 처리 + css.postcss로 충분할 것으로 예상, Feature 1.3에서 검증)
- layout 외 다른 SCSS 파일 전환 (이번 범위는 layout 관련 6개만)
