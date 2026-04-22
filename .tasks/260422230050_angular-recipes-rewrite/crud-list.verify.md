# crud-list.md 재작성 — LLM 검증

대상 파일: `packages/angular/docs/recipes/crud-list.md`

## 검증 항목

### 섹션 구조 (Rule: T1 템플릿 섹션 순서 준수)

- H2 섹션이 다음 순서를 포함한다: "When to use / When NOT to use" → "전제조건" → "기본 레시피" → "변형 (Variation)" → "🚫 흔한 실수 (Anti-patterns)" → "관련 Entry" / Grep `^## `으로 순서 확인
- 삭제 대상 H2 제목이 부재한다: "최소 뼈대 분해 설명", "뷰 타입 분기", "레시피 작성 관용 규칙", "부록 B", "주의사항 (자주 하는 실수)" / Grep 0건

### 최상단 포인터 (Rule: 최상단 CRITICAL 블록 제거)

- 인용 블록(`^> `)의 헤더에 "CRITICAL" 문자열이 없다 / Grep 확인
- 제목(H1) 다음에 modal 용도 관련 1~2줄 포인터 인용 블록이 존재하고, "Anti-patterns"로 이동할 수 있는 앵커 링크가 있다

### When to use / 뷰 범위 가이드 (Rule: When to use + 뷰 범위 선택 가이드, D3)

- "## When to use / When NOT to use" 섹션에 ✅ 항목 ≥ 3개, ❌ 항목 ≥ 3개(각각 crud-detail/data-select-button/page-modal-container 링크)가 포함된다
- "### 뷰 범위 선택" 하위에 page / modal (선택) / modal (조회 전용) / control 4개 항목이 한 줄씩 존재한다
- modal(선택) 행은 `./crud-list/extension-d-select-modal.md`, modal(조회) 행은 `./crud-list/extension-e-readonly-modal.md` 1-level 링크를 건다

### 확장 인덱스 테이블 (Rule: 확장 A~G 인덱스 테이블, D2)

- "## 변형 (Variation)" 섹션 아래 확장 A~G 7개 행을 가진 표가 존재한다
- 표 열 구성이 "확장 / 언제 쓰나 / 전제 / 문서" 4열이다
- 각 행의 "문서" 셀이 `./crud-list/extension-*-*.md` 형태로 1-level 링크한다
- 이전 매트릭스의 10열(imports / DI / input·output / 상태 / computed / effect / 메서드 / hostDirectives / host / 템플릿 블록) 제목이 표 헤더로 존재하지 않는다 / Grep 0건

### 기본 레시피 코드 완결성 (Rule: 기본 레시피는 self-contained 최소 뼈대)

- 코드블록 내에 imports, `@Component({...})`, 템플릿 문자열, 클래스 본문이 모두 존재
- signal 선언: `busyCount`, `initialized`, `items`, `page`, `pageLength`, `sortingDefs`, `filter`, `lastFilter` 포함
- `injectPermsSignal`, `injectViewTypeSignal`, `injectViewTitleSignal` 호출 모두 존재
- `hostDirectives: [{ directive: SdCommandDirective, outputs: ["sdRefreshCommand"] }]` 존재
- `host: { "(sdRefreshCommand)": "onRefreshButtonClick()" }` 존재
- effect 내부에서 `this.lastFilter(); this.page(); this.sortingDefs();`로 의존성 등록하고 `void untracked(async () => {...})` 사용
- `@if (initialized())` 가드와 권한 없음 가드 `@if (!perms().includes("use"))`가 템플릿에 존재
- `orderBy` 사용이 string overload(`qr.orderBy(sortingDef.key, sortingDef.desc ? "DESC" : "ASC")`)
- `obj.getChainValue` 문자열이 기본 레시피 코드 범위 내에 존재하지 않음 (Anti-patterns의 ❌ 예시에는 존재 가능)
- `<sd-sheet>` 바인딩이 `[(currentPage)]="page"`, `[(sorts)]="sortingDefs"`로 양방향임을 확인

### 조건부 요소 포함 기준 표 유지, 분해 표 3개 부재 (D1)

- "### 조건부 요소 포함 기준" 하위에 표 1개 존재 (행: `<sd-topbar-container>` / `injectViewTitleSignal` / `injectViewTypeSignal` / `injectPermsSignal` / `<sd-busy-container>` / `initialized` / `SHARED_DATA_KEY` 7행)
- "블록 역할" 표 제목, "상태 분해" 표 제목, "메서드 분해" 표 제목이 부재 / Grep 0건

### 공통 규칙 1-level 위임 (Rule: 공통 규칙 _common-rules.md로 1-level 위임)

- 파일 내 `./_common-rules.md` 링크가 최소 2회 등장(전제조건 섹션 + 관련 Entry 섹션)
- 공통 규칙 본문(예: "`injectViewTypeSignal()`은 생성자 또는 필드 이니셜라이저에서만 호출한다"의 원문)이 재정의되지 않음 — 본문 설명 없이 링크만 있음
- 전제조건 섹션에 `#injectviewtypesignal`, `#page-컴포넌트가`, `#시트-셀`, `#input-변경`, `#void-this_initasync`, `#signal-필드`, `#mark` 등의 _common-rules 앵커 링크가 포함됨

### Anti-patterns 섹션 (Rule: Anti-patterns 섹션, D4/D5)

- "## 🚫 흔한 실수 (Anti-patterns)" 하위 H3 항목 수 ≥ 4:
  1. "modal = 선택 모달로 반사적 부착"
  2. "뷰 분기를 완전 분리 블록으로 작성"
  3. "`orderBy` 람다 + `obj.getChainValue` 회귀"
  4. "테스트용 public API 노출"
- 각 항목에 ❌ 코드블록과 ✅ 코드블록이 모두 존재
- 각 항목에 `**근거**:` 1줄이 최소 1회 등장 / Grep `\*\*근거\*\*:` 카운트 ≥ 4
- orderBy 항목의 근거에 `queryable.ts:420` 인용 존재
- modal 반사 부착 항목의 근거에 `extension-e-readonly-modal.md` 링크 존재

### 관련 Entry 섹션 (Rule: 관련 Entry 섹션)

- "## 관련 Entry" 하위에 4개 링크:
  - `./_common-rules.md`
  - `./crud-detail.md`
  - `./data-select-button.md`
  - `./page-modal-container.md`
- 각 링크에 "차이: 한 줄" 또는 이에 준하는 한 줄 선택 기준 병기

### 3인칭 서술 (Rule: 3인칭 서술)

- "여러분", "당신", "우리", "~해주세요", "주세요" 표현 0건 / Grep 확인
- "You", "I can" 문자열 0건 (코드블록 식별자 제외 본문 검사) / Grep 확인

### 시그니처·API 참조 소스 정합 (Rule: 시그니처·API 참조 소스 정합)

- 기본 레시피 import에 등장하는 `@simplysm/angular` 심볼이 모두 `packages/angular/src/index.ts`에서 export됨: `injectPermsSignal`, `injectViewTitleSignal`, `injectViewTypeSignal`, `mark`, `SdBusyContainer`, `SdButton`, `SdCommandDirective`, `SdDock`, `SdDockContainer`, `SdForm`, `SdSheet`, `SdSheetColumn`, `SdSheetColumnCellTemplate`, `SdTextfield`, `SdToastProvider`, `SdTopbar`, `SdTopbarContainer`, `SortingDef`
- `@simplysm/core-common`의 `str` import도 실재
- `SdCommandDirective` outputs `sdRefreshCommand` 존재 (`packages/angular/src/core/commands/sd-command.ts:14-40`)

### 링크 무결성

- 본문에 등장하는 모든 `./` 및 `../` 상대 경로 링크의 대상 파일이 실재
  - `./_common-rules.md`
  - `./crud-detail.md`
  - `./data-select-button.md`
  - `./page-modal-container.md`
  - `./crud-list/extension-a-inline-edit.md` ~ `./crud-list/extension-g-excel.md` (7개)
  - `../ui-overlay/sd-busy-container.md` 등 개별 API 문서 링크(파일 존재 여부만 확인)
