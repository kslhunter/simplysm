# WBS: regex-to-parser 2차 후속 수정 (심층 재리뷰 발견사항 반영)

## 프로젝트 개요

- **배경:** `.tasks/260417132441_review-regex-to-parser/`(1차 후속)에 대한 심층 재리뷰(`.tasks/260417143009_review-followup-regex-to-parser/review.md`)에서 5건의 이슈가 확인됨. 특히 LOGIC-001은 Angular 빌드에 실제 영향을 미치는 Critical 회귀이다. 본 WBS는 이를 2차 후속 수정으로 해소한다.
- **환경:** simplysm 모노레포. 영향 패키지: `sd-cli`, `lint`. TypeScript ESM 프로젝트.
- **전제조건:**
  - 1차 후속(`.tasks/260417132441_review-regex-to-parser/wbs.md`)의 Feature 1.1, 1.2, 1.3이 모두 `[x]` 완료 상태.
  - 테스트 통과 확인됨: `esbuild-worker-plugin.spec.ts` 45/45, `esbuild-worker-plugin.acc.spec.ts` 13/13, `ts-no-unused-protected-readonly.spec.ts` 16/16.
- **기술적 제약:**
  - `sd-cli`의 `transformWorkerPatterns`는 `export` 함수이며 Angular 컴파일러 플러그인이 외부 호출한다 → 시그니처 확장은 후방 호환을 유지해야 한다 (기본값 `false`).
  - `@angular/compiler`의 `TmplAstLetDeclaration.value` 타입 선언은 `AST`이지만 런타임에는 `ASTWithSource` 유사체가 들어온다(`compiler.mjs:24563`).
- **참조 자료:**
  - `.tasks/260417143009_review-followup-regex-to-parser/review.md` — 심층 재리뷰 원문 (LOGIC-001~DOC-001)
  - `.tasks/260417132441_review-regex-to-parser/wbs.md` — 1차 후속 WBS (배경)
  - `.tasks/260417132441_review-regex-to-parser/1.1-worker-ts-parsing.md` — 1차 Feature 1.1 설계 (경계조건 "JS만 전달" 전제 확인)
  - `packages/sd-cli/CLAUDE.md` — sd-cli 구조
  - `packages/lint/CLAUDE.md` — lint 규칙/테스트 패턴
  - `packages/sd-cli/src/esbuild/esbuild-worker-plugin.ts` — 수정 대상 (Feature 1.1)
  - `packages/sd-cli/src/esbuild/esbuild-angular-compiler-plugin.ts` — 수정 대상 (`:343`, `:546`)
  - `packages/lint/src/rules/ts-no-unused-protected-readonly.ts` — 수정 대상 (Feature 1.2)
  - `packages/lint/node_modules/@angular/compiler/fesm2022/compiler.mjs:24563` — LetDeclaration 런타임 형상 근거

## Impact Mapping

- **Goal:** regex-to-parser 마이그레이션의 정확성·성능·계약 명확성 확보 — Angular 빌드에서 불필요한 TS 재변환 제거, lint 규칙의 Angular 내부 변화 내성 확보
  - **Actor:** 개발자 (빌드·lint 소비자)
    - **Impact:** Angular 빌드가 emit 파일별 재변환 오버헤드 없이 완료되고, lint 규칙이 Angular 내부 형상 변화에도 견고하게 동작
      - **Deliverable 1:** `transformWorkerPatterns` 호출자가 "이미 JS"임을 계약으로 선언하는 `skipTsTransform` 파라미터
      - **Deliverable 2:** 사전 필터가 `new Worker`·`new SharedWorker`·`import.meta.resolve` 패턴만 통과시키도록 정규식 경계 강화
      - **Deliverable 3:** `findWorkerPatterns` JSDoc에 JS 전제 호출 컨벤션 명시
      - **Deliverable 4:** lint 규칙의 `TmplAstLetDeclaration` 명시 분기로 런타임 의존성 격리
      - **Deliverable 5:** `collectExprIdentifiers` 재귀 가드 단순화 (오해 유발 조건 제거)

## Feature Breakdown

### Epic 1. Worker 번들 플러그인 계약·효율성 개선

#### [x] Feature 1.1 Worker 플러그인 계약 명시화 및 사전 필터 강화

**의존성:** 없음

**범위:**

- `transformWorkerPatterns(content, filePath, build, options?)`에 4번째 파라미터 `options?: { skipTsTransform?: boolean }` 추가
  - 내부 로직: `options?.skipTsTransform === true`이면 `/\.[cm]?ts$/` 확장자 분기를 스킵 (LOGIC-001 A안)
- `esbuild-angular-compiler-plugin.ts:343` 호출부 수정: `transformWorkerPatterns(contents, normalized, build, { skipTsTransform: true })` — emit 결과는 이미 JS이므로 재변환 불필요
- `esbuild-angular-compiler-plugin.ts:546` 호출부: `args.path`가 `.js`이므로 동작 변화 없으나, 계약 일관성을 위해 옵션 전달은 생략 (기본값 사용). 현행 유지
- `esbuild-worker-plugin.ts:381-383` onLoad 내부 호출: 옵션 미전달(기본값 사용) — 원본 소스의 TS 여부가 확장자로만 판단되는 기존 경로 보존
- 사전 필터 강화 (`esbuild-worker-plugin.ts:215-217`) — LOGIC-003 A안:
  - `content.includes("Worker") || content.includes("import.meta.resolve")` → `/\b(new\s+Worker|new\s+SharedWorker|import\.meta\.resolve)\b/.test(content)`
- `findWorkerPatterns` JSDoc 업데이트 (`:39-44`) — DOC-001 A안:
  - `@param content - JavaScript 소스 코드. TypeScript는 상위 transformWorkerPatterns()가 사전 변환한다.` 한 줄 추가
- 기존 테스트 전부 통과 보장: `esbuild-worker-plugin.spec.ts` 45건, `esbuild-worker-plugin.acc.spec.ts` 13건
- 신규 테스트 (`esbuild-worker-plugin.spec.ts`에 describe 블록 추가):
  - `skipTsTransform: true` + `.ts` 경로 + 이미 JS인 content → transformSync 미호출 검증 (예: `import` 구문은 JS에서도 유효하므로, TS 전용 구문이 없는 JS를 넘겨 동작이 동일함을 확인)
  - `skipTsTransform: true` + `.ts` 경로 + 실제 TS 구문(`import type`) 포함 → findWorkerPatterns가 acorn 파싱 실패로 빈 배열 반환 (조용한 누락) — 호출자의 계약 위반 상황이 기존 동작으로 되돌아감을 명세
  - `skipTsTransform: false`(기본) + `.ts` + `import type` 포함 + Worker 패턴 → 정상 감지 (기존 동작 유지)
  - 사전 필터 강화: `const x: Worker = 1;` (Worker 키워드만 존재, `new Worker` 없음) → undefined 반환, transformSync 미호출
  - 사전 필터 강화: `// new Worker(...)`(주석 내 `new Worker`) → 사전 필터는 통과하지만 AST 판별로 undefined
- Angular 컴파일러 플러그인 경로 회귀 테스트 (별도 파일 생성 여부는 구현 시 판단):
  - `esbuild-angular-compiler-plugin.ts:343`을 거치는 시나리오에서 `skipTsTransform: true`가 실제로 전달되어 TS 로더 미호출 검증

**경계:**

- `bundleWorker`, `processWorkerBundle`, `findWorkerPatterns` 내부 AST 순회 로직 변경하지 않음
- `onLoad` 필터 패턴(`/\.[cm]?[jt]sx?$/`) 변경하지 않음
- Angular 컴파일러 플러그인의 emit 결과 처리 흐름(`typeScriptFileCache.set`, `referencedFileTracker` 등)은 Worker 결과 적용 외 수정하지 않음
- 소스맵 처리 개선은 범위 외 (기존과 동일하게 `sourcemap: false`로 transformSync 호출)

**근거:**

- review.md LOGIC-001 [Critical], LOGIC-003 [Low], DOC-001 [Low]
- 사용자 결정: LOGIC-001 A안, LOGIC-003 A안, DOC-001 A안
- 실증: `SdTsCompiler.ts:608`의 `emitResults.push({ filename, contents, sourceFileName: sourceFile.fileName })` — contents는 JS, sourceFileName은 원본 `.ts` 경로. 현재 구현은 sourceFileName 확장자로 판정하여 transformSync를 매 emit 파일마다 추가 호출
- 후방 호환: `transformWorkerPatterns`의 4번째 파라미터는 선택적, 기본값은 기존 동작 유지

#### [x] Feature 1.2 lint 규칙 안정성 개선 (LetDeclaration 명시 분기 + 가드 단순화)

**의존성:** 없음

**범위:**

- `ts-no-unused-protected-readonly.ts`에 `TmplAstLetDeclaration` 명시 분기 추가 (LOGIC-002 A안):
  - 기존: `:93-95`에서 `currentLocals.add(node.name)`만, value 표현식은 공통 `node.value?.ast` 경로에 암묵적 의존
  - 변경: `node instanceof TmplAstLetDeclaration`일 때 `currentLocals.add(node.name)` + `collectExprIdentifiers((node.value as { ast?: unknown }).ast ?? node.value, currentLocals, ids)` 명시 호출
  - 공통 `node.value?.ast` 경로(`:115-117`)는 BoundText·BoundAttribute 용도임을 주석으로 명확화. 단, LetDeclaration에 대해서도 `node.value.ast` 경로가 걸리지 않도록 `instanceof TmplAstLetDeclaration` 가드로 스킵 처리 (이중 수집 방지)
- `collectExprIdentifiers` 재귀 가드 단순화 (DESIGN-001 A안, `:65-67`):
  - 기존: `val != null && typeof val === "object" && typeof val.constructor === "function"`
  - 변경: `val != null && typeof val === "object"`
- 기존 테스트 16건 통과 보장 (특히 `@let total = items.length` 케이스에서 `items`가 참조된 것으로 계속 인식되는지 확인)
- 신규 테스트:
  - `@let a = someRef` 형태에서 `someRef` 필드 참조가 수집됨 (기존 우연한 동작이 아닌 명시 분기로 수집)
  - 중첩 `@let` (`@let x = 1; @let y = x + foo;`)에서 `x`는 로컬 스코프, `foo`는 수집됨 (기존 `collectSiblingNodes`의 스코프 전파와 함께 동작 확인)

**경계:**

- `traverseNode`(ESLint AST 순회 헬퍼) 변경하지 않음
- `collectSiblingNodes`의 `@let` 스코프 전파 로직 변경하지 않음 (이미 1차 후속에서 확립됨)
- `@if`/`@for`/`@switch`/`@defer` 블록 처리는 1차 후속에서 이미 완료됨 → 변경 없음
- `@angular/compiler` 버전 변경 없음

**근거:**

- review.md LOGIC-002 [Medium], DESIGN-001 [Low]
- 사용자 결정: LOGIC-002 A안, DESIGN-001 A안
- 실증: `compiler.mjs:24563` — `return new LetDeclaration$1(decl.name, value, ...)`. `value`는 `bindingParser.parseBinding()` 반환(ASTWithSource 유사체) — 타입 선언(`value: AST`)과 불일치
- 일관성: 다른 블록 노드(`IfBlockBranch`, `ForLoopBlock`, `SwitchBlock`, `SwitchBlockCase`, `DeferredBlock`)는 모두 명시 분기를 가지고 있으며, `LetDeclaration`만 공통 경로에 의존

## 의존성 매트릭스

| Feature | 의존 대상 | 필요 산출물 |
|---------|----------|-----------|
| 1.1     | 없음      | -         |
| 1.2     | 없음      | -         |

**검증 결과:**
- 누락 검증: Feature 1.1은 `esbuild-worker-plugin.ts` + `esbuild-angular-compiler-plugin.ts`, Feature 1.2는 `ts-no-unused-protected-readonly.ts` — 서로 다른 패키지와 파일이므로 산출물 의존 없음
- 순환 검증: 순환 의존성 없음
- 1단계 존재 확인: 2개 Feature 모두 의존성 없음 (모두 1단계)

## 제외 사항

- **이미 1차 후속에서 완료된 Feature들**: TS Worker 탐지(1.1), Angular 제어 흐름 지원(1.2), TOML 의도 주석(1.3)은 본 WBS 범위 외 — 사유: 1차 후속에서 완료(`[x]`), 본 WBS는 그 리뷰 결과의 후속
- **JSX/TSX 파일의 Worker 패턴 탐지**: 1차 WBS에서 이미 제외 — 사유: Worker 플러그인 처리 경로에 해당 파일 없음
- **`acorn` 교체(acorn-typescript 등)**: 1차 WBS에서 이미 기각 — 사유: 본 WBS의 결정(A안 skipTsTransform)으로 더 이상 재변환 오버헤드가 Angular 경로에서 발생하지 않음
- **소스맵 처리 개선**: Worker 패턴 치환 시 원본 TS까지의 소스맵 체인이 끊기는 현상 — 사유: Feature 1.1의 범위 외이며, review.md에서도 Low 이하 이슈로 언급되지 않음
- **`findWorkerPatterns`를 `instanceof` 기반 AST 식별로 교체**: 현재 `node.type === "..."` 문자열 비교 사용 — 사유: acorn의 AST 노드는 class가 아닌 plain object이므로 `instanceof` 적용 불가, 현재 문자열 비교가 표준 acorn 관용구

## 수행 순서

### 1단계 (병렬 수행 가능)

- Feature 1.1: Worker 플러그인 계약 명시화 및 사전 필터 강화
- Feature 1.2: lint 규칙 안정성 개선 (LetDeclaration 명시 분기 + 가드 단순화)
