# 디버그: sdAngularPlugin transform 훅이 pre-bundled .js 파일까지 Linker 처리하여 _c0 변수 충돌

## 출처

- **origin:** `direct` — 소비앱 테스트 실행 시 발생한 에러

## 문제 증상

- **유형:** 에러
- **증상:** `SyntaxError: Identifier '_c0' has already been declared` (7 suites, 0 tests)
- **위치:** 소비앱의 `client-pda/tests/bootstrap.acc.spec.ts`, `client-common/tests/providers/*.spec.ts` (6개)
- **재현 절차:** 소비앱에서 `pnpm check --type test` 또는 `pnpm test` 실행 시, Vitest browser 모드(chromium)에서 Angular 컴포넌트 테스트 suite가 전부 parse-time 에러로 실패

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|                              | E1: `_c0` 충돌 (Angular 컴파일러 변수) | E2: 7개 suite 전부 실패 (parse-time) | E3: transform 훅이 .js 필터링 없음 | E4: Vite pre-bundling은 여러 모듈을 1 파일로 병합 |
|------------------------------|---------------------------------------|--------------------------------------|-------------------------------------|--------------------------------------------------|
| **H1**: pre-bundle + Linker  | C(code) — Linker가 파일별 카운터로 `_c0` 생성 | C(infer) — 모든 Angular 의존성을 가진 suite가 동일하게 실패 | C(code) — `.js` 파일을 필터링 없이 Linker에 전달 | C(doc) — vitejs/vite#3363, angular-cli@3d1c09b |
| **H2**: 모듈 중복 로드       | C(infer) | I — 중복 로드면 일부 suite만 영향 | N | N |

### 결과: 확정 — H1

Vite가 `@simplysm/angular` 등 Angular 라이브러리를 esbuild로 pre-bundle하여 여러 컴포넌트 파일을 하나의 `.js`로 병합한다. `sdAngularPlugin`의 transform 훅이 이 병합된 `.js` 파일을 `JavaScriptTransformer`(Angular Linker)로 처리할 때, 각 컴포넌트마다 `const _c0` 변수를 생성하여 같은 스코프에서 중복 선언이 발생한다.

추가 발견: `@simplysm/angular`는 `compilationMode` 미설정(기본값 `'full'`)으로 빌드되므로, 이미 full AOT 상태이다. 외부 `.js` 의존성에 Linker를 적용할 필요 자체가 없었다.

## 해결 방안

### 방안 A: transform 훅에서 외부 .js 파일 처리 제거

- **설명:** transform 훅이 Pipeline emit 대상인 `.ts` 파일만 처리하도록 수정. 외부 `.js`/`.mjs`는 건드리지 않음
- **장점:** 근본 원인 제거, 플러그인이 본래 역할(패키지 .ts AOT 컴파일)만 수행
- **반론:** Linker가 필요한 partial AOT 라이브러리가 있을 경우 대응 불가 (현재 프로젝트에서는 해당 없음)
- **점수:** 근본해결 9/10, 변경리스크 8/10, 유지보수 9/10 → **평균 8.7/10**

### 방안 B: optimizeDeps.exclude로 Angular 패키지 pre-bundling 제외

- **설명:** 플러그인 config 훅에서 Angular 관련 패키지를 pre-bundling에서 제외
- **장점:** Linker 코드를 유지하면서 충돌 회피
- **반론:** 불필요한 Linker 코드가 남음, 제외 패키지 목록 관리 필요
- **점수:** 근본해결 7/10, 변경리스크 9/10, 유지보수 5/10 → **평균 7.0/10**

### 방안 C: 수행 안 함

- **장점:** 변경 없음
- **반론:** 소비앱 Angular 테스트 전부 실행 불가
- **점수:** 근본해결 0/10, 변경리스크 10/10, 유지보수 10/10 → **평균 6.7/10**

## 선택 결과

**방안 A** (평균 8.7/10)

`vite-angular-plugin.ts`의 transform 훅에서 `.js`/`.mjs` 파일 처리 분기를 제거하고, Pipeline이 emit한 `.ts` 파일만 처리하도록 수정.

수정 파일: `packages/sd-cli/src/angular/vite-angular-plugin.ts`
