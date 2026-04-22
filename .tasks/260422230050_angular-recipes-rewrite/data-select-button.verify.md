# data-select-button.md 재작성 — LLM 검증

대상 파일: `packages/angular/docs/recipes/data-select-button.md`

## 검증 항목

### 섹션 구조 (Rule: T1 템플릿 섹션 순서 준수)

- H2 섹션 순서: "When to use / When NOT to use" → "전제조건" → "기본 레시피" → "변형 (Variation)" → "🚫 흔한 실수 (Anti-patterns)" → "관련 Entry" / Grep `^## ` 순서 확인
- H2 섹션 수 6개 (Contents가 있으면 7개)

### When to use / When NOT to use

- 3패턴 적용 기준 명시: 패턴 1(직접 사용), 패턴 2(`<sd-shared-data-select-button>`), 패턴 3(사용자 정의 wrapper)
- 3개 대체 경로 명시: `<sd-select>`(enum), `<sd-shared-data-select>`(검색형), `<sd-shared-data-select-list>`(페이지네이션)

### 기본 레시피 self-contained

- 모달 컴포넌트(`SdSelectModal<T>` 구현) 코드블록이 존재하며 `import` 구문 포함
- 호출 측 컴포넌트(`<sd-modal-select-button>` 사용) 코드블록이 존재하며 `import` 구문 포함

### 시그니처 정합성 (SdModalSelectButton)

현행 소스(`packages/angular/src/controls/button/sd-modal-select-button.ts:148-217`):
- 본문에서 사용하는 속성이 `value`, `selectedItems`, `modal`, `disabled`, `required`, `inset`, `size`, `selectMode`, `modalOptions`, `searchIcon`에 한정되는가
- 존재하지 않는 속성이 언급되지 않음 (예: `items`, `placeholder` 등은 금지)

### 시그니처 정합성 (SdSelectModal<T>)

현행 소스(`packages/angular/src/controls/button/sd-modal-select-button.ts:30-33`):
- `selectMode: InputSignal<"single" | "multi" | undefined>`
- `selectedItemKeys: InputSignal<any[]>`
- `close: output<SelectModalOutputResult<T> | undefined>` (SdModalContentDef 상속)
- `initialized: signal<boolean>` 또는 동등 표현

모달 예시 코드가 위 4개를 모두 구현하는가

### 시그니처 정합성 (SelectModalOutputResult<T>)

현행 소스(`packages/angular/src/core/select-modal-output-result.ts:4-7`):
- `{ selectedItemKeys: any[]; selectedItems: T[] }` 형태와 일치

### 시그니처 정합성 (SdSharedDataSelectButton)

현행 소스(`packages/angular/src/data/shared-data/sd-shared-data-select-button.ts:60-78`):
- 본문에 사용된 속성: `value`, `items`, `modal`, `selectMode`, `disabled`, `required`, `inset`, `size` 만 등장
- `selectedItems`가 외부 바인딩으로 사용되지 않음 (Anti-patterns에서만 ❌ 예시로 등장)
- `<ng-template [itemOf]="items()" let-item>` 패턴 사용

### 변형 섹션 (Variation)

- 패턴 2 섹션에 `SharedDataBase<TKey>` 타입 제약 명시 (`__valueKey`, `__searchText`, `__isHidden`)
- 패턴 3 섹션에 `void (async () => {...})()` IIFE 패턴 존재
- 패턴 3 섹션에 multi 모드 확장 지점(주석 1줄) 존재
- "시트 셀 안에 삽입" 서브섹션은 1줄 코드 예시 + 공통 규칙 앵커 링크(`_common-rules.md#시트-셀-내부-컨트롤에-insettrue-sizesm을-명시한다`)

### Anti-patterns (🚫 흔한 실수)

- 4건 포함: (1) `SdDataSelectButton`/`SdDataSelectButtonBase` 재도입, (2) modal 반사 단정, (3) `effect(async ...)`, (4) `<sd-shared-data-select-button>`에 `[(selectedItems)]` 외부 바인딩
- 각 항목에 ❌ 코드블록과 ✅ 코드블록(또는 `// ✅` 주석)이 모두 존재
- 각 항목에 `**근거**:` 1줄 존재

### 공통 규칙 중복 제거 (1-level deep)

- 시트 셀 삽입 설명이 `_common-rules.md#시트-셀-내부-컨트롤에-insettrue-sizesm을-명시한다`로 위임됨
- effect async 관련 공통 규칙 링크(`_common-rules.md#input-의존-데이터-로딩에-void-this_initasync를-사용하지-않는다`) 1회 이상 등장

### 3인칭 서술

- "여러분", "당신", "우리" 등장 0건 / Grep `(여러분|당신|우리)` 확인 (단, "관련" 등 무관한 "우리" 오탐 주의)
- 영문 1·2인칭 "You should", "I can", "you can" 등장 0건

### 시간 민감 표현 금지

- "2024년", "2025년", "v1[0-9]", "한때", "이전에는", "예전에는" 등장 0건 / Grep 확인

### 관련 Entry (1-level deep)

- "관련 Entry" 섹션에 `./crud-list/extension-d-select-modal.md` 링크 + 차이점 한 줄 설명
- `./_common-rules.md` 링크 존재

### 소스 경로 인용

- `sd-modal-select-button.ts` 인용 (모달 컴포넌트 섹션 근처)
- `select-modal-output-result.ts` 인용 (SelectModalOutputResult 언급 근처)
- `sd-shared-data-select-button.ts` 인용 (패턴 2 또는 Anti-patterns #4)

### 링크 무결성

- 문서 내 모든 상대 링크(`./...`, `../...`)의 대상이 존재 — 각 링크 파일을 Glob으로 확인
- 1-level deep 위반 없음 (Entry → Entry → Entry 체인 금지)

### 앵커 유효성

- `_common-rules.md` 앵커 대상 H3 제목이 실제로 존재하는지 `_common-rules.md`를 읽어 교차 확인 (GitHub 스타일 slug 생성 규칙)

### 기타 recipes 문서의 본 파일 링크 정합

- Grep으로 `data-select-button.md` 링크를 참조하는 다른 문서(`packages/angular/docs/recipes/**/*.md`, `packages/angular/README.md`, `packages/angular/CLAUDE.md`) 검색
- H2/H3 앵커 변경으로 인한 깨진 링크가 없는지 확인
