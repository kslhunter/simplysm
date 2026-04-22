# 전체 확장 recipe 재작성 — 통합 LLM 검증

대상: `packages/angular/docs/recipes/crud-list/extension-*.md` 7개 + `packages/angular/docs/recipes/crud-detail/extension-*.md` 6개.
개별 verify(2.2 / 3.1)는 별도 파일이 존재하므로 본 파일은 sibling 확장(2.3–2.8 / 3.2–3.7)의 일괄 품질 게이트를 담당한다.

## 공통 검증 항목 (모든 확장)

### 구조 (Rule: T1 확장 템플릿 섹션 정렬)

- 파일 최상단에 진입점으로 돌아가는 브레드크럼(`← [...](../crud-list.md)` 또는 `← [...](../crud-detail.md)`) 1줄 존재
- H1 제목이 "# 확장 {A~G}: {요약}" 형식
- `> **선행:**` 블록쿼트 1줄로 선행 의존 명시 (없으면 "없음 (최소 뼈대 §3에 직접 얹음)")
- `**이 확장이 도입하는 요소:**` 불릿 섹션 존재 (imports/DI/상태/메서드/템플릿 등)
- "포인트" 섹션이 `**포인트:**` 또는 `## 포인트` 헤더로 1회 등장
- 말미에 "Cross-reference" 또는 "관련 Entry" 섹션 1회 등장

### diff 조각 명시 (본 수정 건 — CONSIST-002 반영)

- diff 조각 스타일로 작성된 코드 블록 앞에 `> **아래 코드 블록은 diff 조각이다.**`로 시작하는 안내 블록쿼트가 존재 — 아래 파일들에서 각 1회 이상:
  - `crud-list/extension-a-inline-edit.md` · `extension-b-selection.md` · `extension-c-inline-delete.md` · `extension-d-select-modal.md` · `extension-f-modal-edit.md` · `extension-g-excel.md`
  - `crud-detail/extension-a-edit-save.md` · `extension-b-delete-restore.md` · `extension-c-modal-view.md` · `extension-d-control-view.md` · `extension-e-auxiliary.md` · `extension-f-complex-detail.md`

### API 정합성 (Rule: `@simplysm/*` 실제 시그니처 준수)

- `Queryable`에 존재하지 않는 메서드명 0건:
  - Grep `updateAsync\(` / `insertAsync\(` / `upsertAsync\(` / `deleteAsync\(` — 13개 확장 파일에서 모두 0건 (LOGIC-001/002 재발 방지)
- `oneWayDiffs` 결과 필드명: `d.item` / `d.orgItem` / `d.type`만 사용, `d.target`은 0건 (LOGIC-002 재발 방지)
- `<sd-dock>` 하단 바 용도로 사용되는 블록은 `[position]="'bottom'"` 명시 1회 이상 (해당 파일: `crud-list/extension-d-select-modal.md`, `crud-detail/extension-c-modal-view.md`)
- `setupCanDeactivate`의 인자는 동기 `() => boolean` 형태 (async 콜백 사용 0건)

### Angular 템플릿 유효성

- 시작 태그(`<sd-*` / `<ng-template`) 내부에 HTML 주석(`<!-- -->`) 0건 — 속성 사이 주석은 Angular 파서가 거부 (LOGIC-003 재발 방지)
- 시트 셀 `<ng-template [cell]>` 내부 컨트롤(`<sd-textfield>` / `<sd-select>` / `<sd-shared-data-select>` / `<sd-numpad>` / `<sd-date-range-picker>` / `<sd-textarea>`)에 `[inset]="true"` + `[size]="'sm'"` 동시 명시 (예외 케이스는 공통 규칙 참조)

### 도메인 타입 일관성 (CONSIST-001 반영)

- `crud-list/extension-a-inline-edit.md`의 `ICustomer.name`은 required (`?` 없음)
- `item.name!` non-null 단정 0건 (name이 required이므로 불필요)

### 공통 규칙 위임 (Rule: 1-hop 링크 위임, 본문 재서술 금지)

- 각 확장은 공통 규칙 키워드(`mark` / `setupCanDeactivate` / `inset`/`size` / 삭제 방식 / `_sdSharedData.wait()` / `injectViewTypeSignal()` 호출 시점) 중 관련된 것에 대해 `../_common-rules.md#...` 링크를 최소 1회 사용
- 공통 규칙 본문(❌/✅ 블록 + 근거)을 확장에서 재서술한 경우 0건 — `_common-rules.md`의 H3 헤더와 동일/유사한 문장을 확장에서 반복하지 않음

### 🚫 흔한 실수 섹션

- 각 확장에 `🚫 흔한 실수` 또는 `🚫 Anti-patterns` 섹션이 1회 이상 존재 (확장 e/b는 선택, 나머지는 필수)
- 해당 섹션은 "확장 고유 실수"만 다루고, 공통 규칙 중복 서술은 앞머리 블록쿼트로 배제 명시

## 특이 검증

### 확장 C (crud-list/extension-c-inline-delete.md) — D1

- 컬럼 `[key]="'_isDeleted'"`로 언더스코어 prefix 사용 (DB 컬럼 key와 충돌 방지)
- ❌/✅ 블록에서 `[key]="'isDeleted'"` vs `[key]="'_isDeleted'"` 대비

### 확장 D (crud-list/extension-d-select-modal.md) — D3

- `multi` 모드 "선택 해제"가 `close.emit`을 호출하지 않는다 (❌/✅ 블록으로 방어)
- `selectedItemKeys` 반환에 `.filterExists()` 사용 (index fallback 금지)
- `[position]="'bottom'"` 명시 (❌/✅ 블록으로 방어)

### 확장 F (crud-list/extension-f-modal-edit.md) — DESIGN-003 반영

- "제거 대상" 이후 "전환 후 남는 핵심 요소 체크리스트"(checkbox 리스트) 존재
- 체크리스트가 `hostDirectives` / `host` / DI / 상태 / 메서드 / 템플릿 6 카테고리 이상 포함

### 확장 G (crud-list/extension-g-excel.md) — D2

- zod 스키마 예시에서 필수 필드(`name`)는 `.optional()` 없이 선언
- ExcelWrapper의 실제 API(`read(file, ...)`, `write(wsName, records)`, `wb.toBlob()`, `wb.close()`) 시그니처 준수

### 확장 B (crud-list/extension-b-selection.md) — CONSIST-004 반영

- `_refresh` 재정의 블록 내부에 `// ── 확장 B 추가 블록 시작 ──` / `// ── 확장 B 추가 블록 끝 ──` 마커 존재
- 시트 속성 사이 HTML 주석(`<!-- ← 추가 -->`) 0건

### 확장 F (crud-detail/extension-f-complex-detail.md) — LOGIC-002 반영

- `boxDiffs` 순회 예시 주석에서 `d.item`만 사용, `d.target` 0건
- ORM 호출 예시 주석에서 `db.customerBox()` 형태의 쿼리빌더 체이닝 사용 (존재하지 않는 `insertAsync`/`updateAsync` 0건)

## Anchor 링크 건전성 (DESIGN-001 반영)

- `_common-rules.md`를 참조하는 모든 anchor 링크(`./_common-rules.md#...` / `../_common-rules.md#...`)가 실제 `_common-rules.md`의 H3 헤더 slug와 일치한다.
- GitHub slug 규칙: 한글 유지, 영숫자 소문자, 공백·특수문자(백틱·괄호·따옴표 포함)는 하이픈 또는 제거.
- 자동 검증 권장: `packages/angular/tests/docs/cross-reference-integrity.verify.md` 워크플로에 `_common-rules.md` 링크 수집 + 헤더 slug 매칭 스크립트 1회 추가 제안.

예상 anchor 목록 (수동 확인):

- `#injectviewtypesignal은-생성자-또는-필드-이니셜라이저에서만-호출한다`
- `#page-컴포넌트가-sd-topbar-container와-sd-topbar를-소유한다`
- `#시트-셀-내부-컨트롤에-insettrue-sizesm을-명시한다`
- `#input-변경을-effect-내부에서-filterlastfilterpage에-반영한다`
- `#공유-데이터-사용-화면은-_refresh-선두에서-_sdshareddatawait를-호출한다`
- `#sdcommanddirective-부착-위치를-한-곳에-둔다`
- `#삭제-방식은-db-스키마에-따라-결정한다`
- `#input-의존-데이터-로딩에-void-this_initasync를-사용하지-않는다`
- `#signal-필드-초기값에서-다른-signal을-읽지-않는다`
- `#marksig를-저장-감지-수단으로-사용하지-않는다`

## 진입점 범위 명시 (DESIGN-002 반영)

- `crud-list.md`의 기본 레시피 섹션에 "이 최소 뼈대가 포함하지 않는 것"을 한 줄 이상으로 명시 — 감사 필드·FK 표시·편집 권한·편집 컨트롤이 모두 확장 A 이후에 도입됨을 선언
- `crud-detail.md`의 기본 레시피는 page 전용 읽기 폼이므로 감사 필드를 포함한다는 범위 차이를 독자가 인지할 수 있어야 한다

## 통과 기준

- 위 모든 항목이 Grep/수동 확인으로 확인되면 통과
- 실패 항목이 1건이라도 있으면 해당 항목의 범주(LOGIC/CONSIST/DESIGN)에 따라 해당 이슈를 재오픈
