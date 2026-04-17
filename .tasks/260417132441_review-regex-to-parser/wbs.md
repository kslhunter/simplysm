# WBS: regex-to-parser 마이그레이션 리뷰 후속 수정

## 프로젝트 개요

- **배경:** `.tasks/260417014731_regex-to-parser/` 작업(정규식 → AST/파서 마이그레이션) 완료 후, `/sd-review`로 심층 리뷰를 수행하여 4건의 발견사항이 확인됨. Critical 회귀 1건, Medium 회귀 1건, Low 개선 제안 2건. 이를 후속 작업으로 수정한다.
- **환경:** simplysm 모노레포. 영향 패키지: `sd-cli` (2건), `lint` (1건). TypeScript ESM 프로젝트.
- **전제조건:** 원본 WBS의 모든 Feature가 `[x]` 완료 상태 (`.tasks/260417014731_regex-to-parser/wbs.md`).
- **기술적 제약:**
  - `sd-cli` 패키지에 `esbuild`, `acorn`, `acorn-walk`, `typescript`, `smol-toml` 이미 설치
  - `lint` 패키지에 `@angular/compiler` 이미 설치
  - ESM 프로젝트이므로 CJS 전용 라이브러리 사용 불가
- **참조 자료:**
  - `.tasks/260417132441_review-regex-to-parser/review.md` — 리뷰 발견사항 원문
  - `.tasks/260417014731_regex-to-parser/wbs.md` — 원본 마이그레이션 WBS (배경 이해용)
  - `.tasks/260417014731_regex-to-parser/1.1-worker-pattern-ast.md` — Worker 플러그인 설계 결정 이력
  - `packages/sd-cli/CLAUDE.md` — sd-cli 패키지 구조
  - `packages/lint/CLAUDE.md` — lint 패키지 규칙 구조 및 테스트 패턴

## Impact Mapping

- **Goal:** regex-to-parser 마이그레이션의 정확성·완결성 확보 — 회귀 버그를 제거하고 개선 제안을 반영
  - **Actor:** 개발자 (코드 유지보수자·소비자)
    - **Impact:** 서버 빌드 및 lint 규칙이 의도한 대로 정확히 동작하여, 정규식 오탐/누락 재발생 없이 AST/파서 기반 정확성을 실현
      - **Deliverable 1:** sd-cli Worker 플러그인이 TypeScript 파일의 Worker 패턴도 정확히 탐지
      - **Deliverable 2:** lint 규칙이 Angular 17+ 제어 흐름 블록(`@if`/`@for`/`@switch`) 내 필드 참조를 정확히 인식
      - **Deliverable 3:** TOML 파싱 실패 시 명시적 크래시의 의도를 코드에 문서화

## Feature Breakdown

### Epic 1. regex-to-parser 마이그레이션 후속 수정

#### [x] Feature 1.1 Worker 플러그인 TypeScript 파싱 지원

**의존성:** 없음

**범위:**

- `transformWorkerPatterns()` (`packages/sd-cli/src/esbuild/esbuild-worker-plugin.ts:209`) 내부에서 파일 경로가 `.ts`/`.cts`/`.mts`인 경우, `build.esbuild.transformSync(content, { loader: "ts", sourcemap: false })`로 JS로 변환 (D1: `.tsx`/`.jsx`는 처리 경로에 존재하지 않아 제외)
- 변환된 JS에 대해 `findWorkerPatterns()` 호출 및 `processWorkerBundle()` 처리, chunks 조립
- `createWorkerBundlePlugin`의 onLoad (`:354`)에서 TS(`.ts`/`.cts`/`.mts`) 파일인 경우 반환되는 `contents`는 변환된 JS, `loader`는 `"js"`로 반환. `.tsx`/`.jsx`는 방어적으로 `"tsx"` 로더 반환
- 사전 필터(`content.includes("Worker")`, `content.includes("import.meta.resolve")`)는 원본 TS content 기준으로 그대로 유지하여 transformSync 오버헤드 최소화
- TS 변환 실패(문법 오류) 시 `esbuild.TransformFailure.errors`를 `TransformWorkerResult.errors`에 담아 반환 (D2: 조용한 무시 금지. onLoad가 errors 포함 결과를 반환하면 esbuild가 해당 파일 처리를 중단하여 본체 중복 에러 없음)
- 기존 테스트(`packages/sd-cli/tests/esbuild/esbuild-worker-plugin.spec.ts`, `esbuild-worker-plugin.acc.spec.ts`) 통과 보장
- TypeScript 파일에서 Worker 패턴 감지 케이스 테스트 추가:
  - `import type` 구문이 포함된 TS 파일에서 `new Worker(new URL(..., import.meta.url))` 탐지
  - `import type` 구문이 포함된 TS 파일에서 `import.meta.resolve("./...")` 탐지
  - 타입 어노테이션이 있는 변수 선언(`const w: Worker = new Worker(...)`) 탐지
  - 주석/문자열 리터럴 내 패턴은 여전히 무시됨

**경계:**

- `bundleWorker()`, `processWorkerBundle()`, `findWorkerPatterns()` 내부 AST 순회 로직은 변경하지 않음
- Angular 컴파일러 경로(`esbuild-angular-compiler-plugin.ts:343,546`)는 이미 JS를 전달하므로 영향 없음
- JSX/TSX 파일 처리는 Feature 1.1 범위 외 (D1: 사용자 확인 — Worker 플러그인 처리 경로에 `.tsx`/`.jsx` 파일은 존재하지 않음). onLoad 필터는 방어적으로 매치 유지하되 내부 변환은 하지 않음

**근거:**

- review.md LOGIC-001 [Critical]
- 실증 사례: `packages/service-server/src/protocol/protocol-wrapper.ts:36` — `.ts` 파일에 `import.meta.resolve("../workers/service-protocol.worker")` 패턴 존재. `import type { Bytes } from "@simplysm/core-common"` 등 TS 구문이 있어 acorn 파싱 실패
- 사용자 결정: A안 (esbuild.transformSync로 TS → JS 변환 후 처리)
- 설계 결정 (자세히는 Feature 1.1 문서 참조):
  - D1: `.tsx`/`.jsx`는 Worker 플러그인 처리 경로에 존재하지 않아 변환 대상에서 제외
  - D2: transformSync 실패 시 errors에 명시적 보고 (조용한 무시 금지)
- 참조: 같은 패키지의 `esbuild-postcss-plugin.ts`(acorn 기반, JS만 처리)는 이 문제가 없음 — 비교 대상으로 활용

#### [x] Feature 1.2 lint 규칙 Angular 제어 흐름 지원 및 타입 안전성 개선

**의존성:** 없음

**범위:**

- `collectTemplateNodeIdentifiers()` (`packages/lint/src/rules/ts-no-unused-protected-readonly.ts:63`)에 Angular 17+ 블록 노드의 고유 표현식 속성 처리 추가:
  - `IfBlockBranch.expression` (조건 표현식), `expressionAlias`(있으면 로컬 변수로 추가)
  - `ForLoopBlock.expression` (iterable), `trackBy`(트랙 표현식) 처리
  - `ForLoopBlock.item.name`과 `contextVariables[].name`(`$index`, `$first`, `$last`, `$even`, `$odd`, `$count`)을 currentLocals에 추가
  - `SwitchBlock.expression`, `SwitchBlockCase.expression` 처리 + `SwitchBlock.groups[]` 및 `SwitchBlockCaseGroup.cases[]` 순회
  - `IfBlock.branches[]`, `ForLoopBlock.empty.children` 순회 (블록 자체 `children` 없음 대응)
  - `DeferredBlock`/`BoundDeferredTrigger` 지원 (D1 결정): `triggers`/`prefetchTriggers`/`hydrateTriggers` 내 `BoundDeferredTrigger.value` 수집, `placeholder`/`loading`/`error`의 `children` 재귀
- `collectExprIdentifiers()` (`packages/lint/src/rules/ts-no-unused-protected-readonly.ts:30`)에서 `constructor.name` 문자열 비교를 `instanceof` 체크로 교체:
  - `@angular/compiler`의 `PropertyRead`, `ImplicitReceiver`, `ThisReceiver` 클래스 import
  - `ast instanceof PropertyRead && (ast.receiver instanceof ImplicitReceiver || ast.receiver instanceof ThisReceiver)` 형태로 변경
- `collectTemplateNodeIdentifiers()`의 `LetDeclaration` 문자열 비교(`:80`)도 `instanceof LetDeclaration`으로 교체 (D2 결정, 같은 파일 일관성)
- 기존 테스트(`packages/lint/tests/ts-no-unused-protected-readonly.spec.ts`) 통과 보장
- 테스트 보강:
  - `@if (isEnabled) { ... }` — `isEnabled` 필드가 사용되었다고 인식되는지
  - `@for (item of items; track item.id)` — `items` 필드가 사용되었다고 인식되는지
  - `@for`의 `item` 로컬 변수와 동명의 필드 — 필드는 미사용으로 인식되는지 (기존 `*ngFor` 테스트와 동등)
  - `@switch (currentCase) { @case (...) { ... } }` — `currentCase` 필드가 사용되었다고 인식되는지

**경계:**

- 기존 `traverseNode()` 헬퍼(ESLint AST 순회, 클래스 본문 검사용)는 변경하지 않음
- 다른 `ts-*` / `ng-template-*` 규칙 파일은 변경하지 않음
- Angular 컴파일러의 `@angular/compiler` 버전 의존성 변경 없음 (이미 설치됨)

**근거:**

- review.md LOGIC-002 [Medium], DESIGN-001 [Low]
- Angular 컴파일러 AST 구조 직접 검증 완료:
  - `@if (isEnabled)` → `IfBlockBranch.expression.ast` = `PropertyRead(name="isEnabled")` on `ImplicitReceiver`
  - `@for (item of items)` → `ForLoopBlock.expression.ast` = `PropertyRead(name="items")` on `ImplicitReceiver`, `item` / `contextVariables` 존재
- 코드베이스에서 `@if`, `@for` 사용 확인: `packages/angular/src/layout/topbar/sd-topbar.ts:24`, `sd-topbar-user.ts:33`, `sd-topbar-menu.ts:54`, `sd-sidebar-user.ts:24` 등. `@defer` 사용 0건, `@let` 사용 1건(`sd-sheet.ts`)
- 사용자 결정: A안 (4건 모두 수정) — Medium + Low 개선안 모두 포함
- 설계 결정 (자세히는 Feature 1.2 문서 참조):
  - D1: `DeferredBlock`/`BoundDeferredTrigger` 처리 포함 — 현재 사용처 0이지만 추후 `@defer` 도입 시 조용한 false positive 방지 (선투자적 지원)
  - D2: `LetDeclaration`의 `constructor.name` 비교도 `instanceof`로 교체 — 같은 파일 내 AST 식별 방식 일관성

#### [x] Feature 1.3 TOML 파싱 실패 시 명시적 에러 의도 문서화

**의존성:** 없음

**범위:**

- `packages/sd-cli/src/deps/server-externals/server-production-files.ts:114` — `TOML.parse()` 호출 주변에 의도 설명 주석 추가
- 주석 내용 (WHY): `mise.toml`은 저장소에서 관리되는 설정 파일이므로, 파싱 실패 시 조용히 폴백하지 않고 빌드를 중단하여 설정 오류를 즉시 드러낸다
- 코드 동작 변경 없음 (try-catch 추가하지 않음)
- 기존 테스트 영향 없음 (행위 동일)

**경계:**

- `TOML.parse()` 호출 자체는 변경하지 않음
- 다른 YAML 파싱 로직(`YAML.parse`)은 변경 범위 밖

**근거:**

- review.md DESIGN-002 [Low]
- 사용자 결정: B안 (현행 유지 + 주석) — 명시적 크래시는 엄격한 완벽주의 원칙(CLAUDE.md)에 부합
- 원본 정규식의 "조용한 폴백"은 정규식 한계였지 의도된 동작이 아니었음

## 의존성 매트릭스

| Feature | 의존 대상 | 필요 산출물 |
|---------|----------|-----------|
| 1.1 | 없음 | - |
| 1.2 | 없음 | - |
| 1.3 | 없음 | - |

**검증 결과:**
- 누락 검증: 각 Feature는 서로 다른 파일/함수를 대상으로 하며, 상호 산출물 의존 없음
- 순환 검증: 순환 의존성 없음
- 1단계 존재 확인: 3개 Feature 모두 의존성 없음 (모두 1단계)

## 제외 사항

- **JSX/TSX 파일의 Worker 패턴 탐지**: 현재 Worker 플러그인 사용 경로에서 `.tsx` 파일이 Worker를 생성하는 사례가 없음. 필요 시 Feature 1.1의 transformSync 옵션만 `.tsx`용으로 분기 추가하면 되므로, 당장의 스코프 외.
- **원본 WBS의 Feature 2.1 이외 lint 규칙 재검토**: 리뷰 대상이 Feature 2.1(`ts-no-unused-protected-readonly`)에 한정되었으므로 다른 `ng-template-*` 규칙은 범위 외.
- **acorn을 TypeScript-aware 파서로 교체**: `acorn-typescript` 등 대안 검토는 C안(TypeScript Compiler API)과 함께 D1 결정에서 기각됨. 현재 선택(A안 transformSync)이 esbuild 의존성을 재활용하여 일관성·효율성 우수.

## 수행 순서

### 1단계 (병렬 수행 가능)

- Feature 1.1: Worker 플러그인 TypeScript 파싱 지원
- Feature 1.2: lint 규칙 Angular 제어 흐름 지원 및 타입 안전성 개선
- Feature 1.3: TOML 파싱 실패 시 명시적 에러 의도 문서화
