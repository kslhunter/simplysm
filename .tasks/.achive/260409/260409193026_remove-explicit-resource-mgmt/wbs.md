# WBS: Explicit Resource Management 제거 (Node.js 20 호환)

## 프로젝트 개요

- **배경:** `await using`/`using` 구문 및 `Symbol.dispose`/`Symbol.asyncDispose` API가 Node.js 20에서 지원되지 않아, 소비앱의 vitest transpiler(esbuild)에서 파싱 에러가 발생한다. dist 빌드 출력물에 해당 구문이 downlevel 컴파일 없이 그대로 노출되는 것이 직접 원인이다.
- **환경:** simplysm 모노레포 — `core-common`, `excel` 패키지가 영향 받음. 소비앱은 Node.js 20 + vitest 환경.
- **전제조건:** Node.js 20을 타겟 런타임으로 고정. Node.js 20 미지원 기능은 사용하지 않는다.
- **기술적 제약:** 각 클래스에 이미 `dispose()` / `close()` 메서드가 존재하므로, `Symbol.dispose`/`Symbol.asyncDispose`를 제거해도 기능 손실 없음.

## Impact Mapping

- **Goal:** Node.js 20 기반 소비앱에서 구문 에러 0건 달성
  - **Actor:** simplysm 라이브러리 소비 개발자
    - **Impact:** vitest 실행 및 런타임에서 에러 없이 라이브러리를 사용
      - **Deliverable:** Explicit Resource Management 구문/API 완전 제거 및 try-finally 패턴 대체

## Feature Breakdown

### Epic 1. Explicit Resource Management 제거

#### [x] Feature 1.1: core-common — Symbol.dispose/asyncDispose 메서드 제거

> 📄 Feature 문서: [1.1-core-common-symbol-dispose-removal.md](./1.1-core-common-symbol-dispose-removal.md)

**의존성:** 없음

**범위:**

- `EventEmitter`의 `[Symbol.dispose]()` 메서드 제거 (`src/features/event-emitter.ts:111~116`)
- `DebounceQueue`의 `override [Symbol.dispose]()` 메서드 제거 (`src/features/debounce-queue.ts:59~64`)
- `SerialQueue`의 `override [Symbol.dispose]()` 메서드 제거 (`src/features/serial-queue.ts:48~53`)
- `LazyGcMap`의 `[Symbol.dispose]()` 메서드 제거 (`src/types/lazy-gc-map.ts:98~101`)
- `ZipArchive`의 `async [Symbol.asyncDispose]()` 메서드 제거 (`src/utils/zip.ts:221~226`)
- `ZipArchive` JSDoc의 `await using` 예시를 try-finally + `close()` 패턴으로 변경 (`src/utils/zip.ts:27~43`)

**경계:**

- 기존 `dispose()` / `close()` 메서드는 그대로 유지 (Symbol 래퍼만 제거)

**근거:**

- dist 출력물에 `[Symbol.asyncDispose]()`, `[Symbol.dispose]()` 그대로 노출 확인
- Node.js 20에서 `using`/`await using` 구문이 없어 해당 메서드를 트리거할 방법이 없음 (dead code)
- 각 Symbol 메서드는 기존 `dispose()`/`close()`에 단순 위임하는 래퍼임을 코드에서 확인

**설계 결정 요약:**

- D1: 메서드 + JSDoc 완전 삭제 방식 채택 (기능 손실 없음)
- D2: try-finally + close() 패턴으로 JSDoc 예시 대체
- 상속 고려: DebounceQueue/SerialQueue가 EventEmitter를 상속하여 override 사용 → 기반+하위 클래스 모두 동시 제거 필수

#### [x] Feature 1.2: core-common 테스트 — using/await using 구문 대체

> 📄 Feature 문서: [1.2-core-common-test-using-replacement.md](./1.2-core-common-test-using-replacement.md)

**의존성:** Feature 1.1

**범위:**

- `tests/utils/zip.spec.ts:206~217` — `await using result = new ZipArchive(...)` → try-finally + `close()`
- `tests/utils/serial-queue.spec.ts:259~275` — `using queue = new SerialQueue()` → try-finally + `dispose()`
- `tests/utils/debounce-queue.spec.ts:209~221` — `using queue = new DebounceQueue(100)` → try-finally + `dispose()`
- `tests/types/lazy-gc-map.spec.ts:397~412` — `using map = new LazyGcMap(...)` → try-finally + `dispose()`

**경계:**

- 테스트 로직(검증 내용) 변경 없음. 리소스 정리 구문만 대체
- 테스트 이름/주석은 `using` 참조를 제거하고 실제 검증 동작으로 변경

**근거:**

- 이 프로젝트의 vitest에서도 동일한 transpiler 미지원 문제 발생 가능
- Feature 1.1에서 Symbol 메서드를 제거하므로, 테스트도 일반 메서드 호출로 변경 필요

**설계 결정 요약:**

- D1: try-finally + dispose()/close() 패턴 채택
- D2: 테스트 이름을 실제 검증 동작 기반으로 변경

#### [x] Feature 1.3: excel — await using 구문 및 Symbol.asyncDispose 제거

> 📄 Feature 문서: [1.3-excel-await-using-symbol-asyncdispose-removal.md](./1.3-excel-await-using-symbol-asyncdispose-removal.md)

**의존성:** Feature 1.1 (excel → core-common 의존)

**범위:**

- `src/excel-wrapper.ts:34` — `await using wb = new ExcelWorkbook(file)` → try-finally + `close()` 패턴으로 변경
- `src/excel-workbook.ts:205~207` — `async [Symbol.asyncDispose]()` 메서드 제거
- `src/excel-wrapper.ts:95~101` JSDoc에서 `await using` 예시를 try-finally 패턴으로 변경
- `src/excel-workbook.ts:26~27` JSDoc에서 `await using` 예시를 try-finally 패턴으로 변경

**경계:**

- `ExcelWorkbook.close()` 메서드는 유지

**근거:**

- `dist/excel-wrapper.js:21`에 `await using` 구문 그대로 노출 — 소비앱 파싱 에러의 직접 원인
- `ExcelWorkbook`의 `[Symbol.asyncDispose]()`는 `close()`에 단순 위임하는 래퍼 확인

**설계 결정 요약:**

- D1: 메서드 완전 삭제 방식 채택 (Feature 1.1과 동일)
- D2: ExcelWorkbook JSDoc에 이미 try-finally 예시 존재하므로, await using 블록만 제거
- D3: read() 메서드를 try-finally + close() 패턴으로 변환

#### [x] Feature 1.4: LLM 참조 문서 업데이트

> 📄 Feature 문서: [1.4-llm-reference-docs-update.md](./1.4-llm-reference-docs-update.md)

**의존성:** Feature 1.1, 1.3

**범위:**

- `packages/excel/CLAUDE.md` — `await using` 예시를 try-finally + `close()` 패턴으로 변경
- `packages/core-common/CLAUDE.md` — `using` 예시를 try-finally + `dispose()` 패턴으로 변경
- `.claude/references/sd-simplysm14/excel/usage.md` — `await using` 예시 변경
- `.claude/references/sd-simplysm14/excel/docs/wrapper.md` — `await using` 언급 변경
- `.claude/references/sd-simplysm14/excel/docs/core-classes.md` — `await using` 언급 및 `Symbol.asyncDispose` 시그니처/설명 변경
- `.claude/references/sd-simplysm14/core-common/docs/utils.md` — `await using` 예시 및 `Symbol.asyncDispose` 시그니처/설명 변경
- `.claude/references/sd-simplysm14/core-common/usage.md` — `using` 예시 변경 (codebase grep으로 추가 발견)
- `.claude/references/sd-simplysm14/core-common/docs/features.md` — `Symbol.dispose` 시그니처/설명 및 `using` 예시 변경 (codebase grep으로 추가 발견)
- `.claude/references/sd-simplysm14/core-common/docs/types.md` — `using` 안내 문구 및 `Symbol.dispose` 시그니처/설명 변경 (codebase grep으로 추가 발견)

**경계:**

- 코드 변경 없음 (문서만 수정)

**근거:**

- 소비자가 LLM 문서를 참조하여 `await using`을 사용하면 동일 에러 발생

**설계 결정 요약:**

- D1: WBS에 누락된 3개 파일(core-common usage.md, features.md, types.md)을 범위에 포함 — codebase grep으로 동일 패턴 확인
- D2: try-finally 패턴에서 async 리소스는 `await close()`, sync 리소스는 `dispose()` 호출

## 제외 사항

- 없음
