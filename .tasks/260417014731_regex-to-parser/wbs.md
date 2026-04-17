# WBS: 정규식 기반 코드/구조화 텍스트 파싱을 AST/전용 파서로 교체

## 프로젝트 개요

- **배경:** 코드베이스에서 AST나 전용 파서를 사용해야 할 곳에서 정규식으로 우회하여 구조화된 텍스트를 파싱하는 4건이 발견됨. 주석/문자열 내 오탐, 복잡한 구문 누락 등의 잠재적 문제가 있음.
- **환경:** simplysm 모노레포. 대상 패키지: `sd-cli`(3건), `lint`(1건). TypeScript ESM 프로젝트.
- **전제조건:** 없음
- **기술적 제약:**
  - `sd-cli` 패키지에 `acorn`, `acorn-walk`이 이미 설치되어 있음
  - `lint` 패키지에 `@angular-eslint/utils`가 이미 설치, `@angular/compiler`는 transitive dep으로 존재
  - ESM 프로젝트이므로 CJS 전용 라이브러리 사용 불가
- **참조 자료:**
  - `packages/sd-cli/CLAUDE.md` — sd-cli 패키지 구조 및 아키텍처
  - `packages/lint/CLAUDE.md` — lint 패키지 규칙 구조 및 테스트 패턴

## Impact Mapping

- **Goal:** 구조화된 텍스트 파싱의 정확성 향상 — 오탐/누락을 구조적으로 제거
  - **Actor:** 개발자 (코드 유지보수자)
    - **Impact:** 코드 파싱 로직 수정 시 정규식의 엣지케이스를 고려할 필요 없이 AST/파서 API만 사용
      - **Deliverable 1:** Worker 패턴 탐지를 acorn AST로 교체 (sd-cli)
      - **Deliverable 2:** ESM import 경로 치환을 es-module-lexer로 교체 (sd-cli)
      - **Deliverable 3:** Angular 템플릿 식별자 탐지를 @angular/compiler parseTemplate으로 교체 (lint)
      - **Deliverable 4:** TOML 파싱을 smol-toml로 교체 (sd-cli)

## Feature Breakdown

### Epic 1. sd-cli 정규식 파싱 교체

#### [x] Feature 1.1 Worker 패턴 탐지를 acorn AST로 교체

**의존성:** 없음

**범위:**

- `WORKER_PATTERN` 정규식을 acorn AST 파싱으로 교체: `new Worker(new URL("path", import.meta.url))` 및 `new SharedWorker(...)` 패턴 탐지
- `NODE_WORKER_PATTERN` 정규식을 acorn AST 파싱으로 교체: `import.meta.resolve("./relative-path")` 패턴 탐지
- `transformWorkerPatterns()` 함수의 인터페이스(입출력)는 유지하되 내부 구현만 교체
- AST에서 정확한 위치(start/end)를 얻어 문자열 치환 수행
- 기존 테스트(`packages/sd-cli/tests/esbuild/esbuild-worker-plugin.spec.ts`) 통과 보장

**경계:**

- `bundleWorker()`, `processWorkerBundle()`, `createWorkerBundlePlugin()` 등 Worker 번들링 로직 자체는 변경하지 않음
- esbuild-angular-compiler-plugin.ts의 `transformWorkerPatterns` 호출부는 인터페이스가 유지되므로 변경 불필요

**근거:**

- 현재 정규식은 주석/문자열 내 오탐, 여러 줄 코드 누락, 옵션 객체 중첩 `{}` 시 깨짐 가능
- `acorn`이 sd-cli dependencies에 이미 설치되어 있어 추가 의존성 불필요
- 호출처: `esbuild-angular-compiler-plugin.ts:343,546`, `server-esbuild-context.ts:13`, `server-build.worker.ts:21`

#### [x] Feature 1.2 ESM import 경로 치환을 es-module-lexer로 교체

**의존성:** 없음

**범위:**

- `es-module-lexer` 패키지를 sd-cli dependencies에 추가
- `addJsExtensionToImports()` 함수 (`output-path-rewriter.ts:10-18`): 정규식 대신 es-module-lexer로 import/export specifier 위치를 얻어 `.js` 확장자 추가
- `rewriteScssImports()` 함수 (`output-path-rewriter.ts:27-37`): 정규식 대신 es-module-lexer로 `.scss` → `.css` 변환
- `writeChangedOutputFiles()` 함수 (`esbuild-config.ts:22-26`): 동일한 정규식 패턴을 es-module-lexer로 교체
- 함수 시그니처(입출력)는 유지
- 기존 테스트 통과 보장

**경계:**

- `adjustMapSources()`, `createOutputPathRewriter()` 등 경로 재작성 함수는 import 파싱과 무관하므로 변경하지 않음

**근거:**

- 현재 정규식 `/((?:from|import)\s*["'])(\.\.?\/[^"']*?)(["'])/g`는 주석/문자열 리터럴 내 `from "..."` 패턴을 오탐할 수 있음
- `es-module-lexer`는 Vite/Rollup에서 사용하는 업계 표준, ESM import/export specifier 추출에 특화
- 호출처: `SdTsCompiler.ts:428`, `ngtsc-build-core.ts:217`, `server-build.worker.ts:172`, `server-esbuild-context.ts:104`

#### [x] Feature 1.3 TOML 파싱을 smol-toml로 교체

**의존성:** 없음

**범위:**

- `smol-toml` 패키지를 sd-cli dependencies에 추가
- `generateProductionFiles()` 함수 내 mise.toml 파싱 정규식 (`server-production-files.ts:113`) 교체:
  - `smol-toml`의 `parse()`로 TOML 구조를 파싱하여 `tools.node` 값을 정확히 추출
- 기존 테스트 통과 보장

**경계:**

- `parseLockfileVersions()`의 `@(\d.+)$` 정규식은 패키지명@버전 분리용이므로 이 Feature의 범위가 아님 (TOML과 무관)
- YAML 파싱(`yaml` 라이브러리)은 이미 적절하게 사용 중이므로 변경하지 않음

**근거:**

- 현재 정규식 `/node\s*=\s*"([^"]+)"/`는 `[tools]` 섹션 구분 없이 파일 전체에서 매칭하여, 다른 섹션에 `node = "..."` 가 있으면 오탐
- `smol-toml`은 0-dependency, ESM 네이티브, ~15KB로 가벼움
- 호출처: `server-build.worker.ts:216`

### Epic 2. lint 패키지 정규식 파싱 교체

#### [x] Feature 2.1 Angular 템플릿 식별자 탐지를 @angular/compiler parseTemplate으로 교체

**의존성:** 없음

**범위:**

- `@angular/compiler`를 lint 패키지의 dependencies에 추가 (현재 `@angular-eslint`의 transitive dep으로 존재하나 명시적 추가)
- `ts-no-unused-protected-readonly.ts`의 `usedInTemplate` 판단 로직 교체 (라인 106-109):
  - `@angular/compiler`의 `parseTemplate()`으로 인라인 템플릿 문자열을 AST로 파싱
  - AST를 순회하여 바인딩 표현식(interpolation, property binding, event binding 등) 내 식별자만 수집
  - 로컬 변수 선언(`*ngFor="let item"`, `@let item`)을 제외하여 false positive 방지
- `escapeRegExp()` 함수 제거 (더 이상 불필요)
- 기존 테스트(`packages/lint/tests/ts-no-unused-protected-readonly.spec.ts`) 통과 및 보강

**경계:**

- `traverseNode()` 헬퍼는 클래스 멤버 AST 순회에 여전히 사용되므로 유지 (템플릿 파싱과 무관)
- 다른 ng-template-* 규칙들은 변경하지 않음

**근거:**

- 현재 정규식은 단어 경계만 검사하여, `*ngFor="let item of items"` 등 로컬 변수 선언에서 `item` 필드를 사용 중이라고 오탐할 수 있음 (false positive → 유효한 필드를 삭제하지 않음)
- 같은 패키지의 `ng-template-no-strict-null-check.ts`, `ng-template-sd-require-binding-attrs.ts`는 이미 AST 기반(`getTemplateParserServices`)을 사용 중
- 호출처: `eslint-plugin.ts:8,19`, `eslint-recommended.ts:233`

## 제외 사항

- `ng-template-no-todo-comments.ts`의 HTML 주석 정규식 (`/<!--([\s\S]*?)-->/g`) — 단순 주석 검출이므로 정규식이 적절. Goal(구조적 오탐 제거)에 직접 기여하지 않음.
- `search-parser.ts`의 검색 쿼리 파싱 — 자체 DSL로 잘 문서화되어 있고 테스트 커버리지 확보됨. 현재 정확하게 동작.
- `replace-deps-resolve.ts`의 glob 패턴 → 정규식 변환 — 지원하는 glob 문법이 `*`뿐이라 정규식으로 충분.
- `date-time.ts`, `date-only.ts`의 날짜 문자열 파싱 — 고정 포맷이므로 정규식이 적절.
- `excel-utils.ts`의 셀 주소 파싱 — 구조가 단순하여 정규식이 적절.
