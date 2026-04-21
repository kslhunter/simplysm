# WBS: @simplysm/angular 문서(recipes + docs + README) 재편

## 프로젝트 개요

- **배경:** `packages/angular/` 문서는 `docs/recipes/*.md`가 "풀 옵션 baseline"을 전제로 작성되어 있어, LLM·개발자가 단순 조회 페이지를 만들 때도 풀 옵션에서 "뺄 것"을 추적해야 한다. 또한 개별 API 상세(예: `<sd-sheet>` [cell] 템플릿, `<sd-dock>` position, `injectViewTypeSignal` 호출 제약)가 recipes에 혼재하여 "해당 API 단독 사용법"을 찾으려면 recipes 전체를 훑어야 한다. 이를 "최소 → 확장 누적" 레시피 구조 + 개별 API 상세를 `docs/*.md`로 이관하여 양방향 위키형 연결로 재편한다.
- **환경:** `@simplysm/angular`는 Angular 21 기반 zoneless signal UI 라이브러리 (152 TS source files). 문서 주 독자는 (a) 소비 프로젝트의 Claude LLM (화면 조립 시 recipes·docs 양쪽 참조), (b) simplysm 내부 개발자·유지보수자.
- **전제조건:**
  - recipes 재설계는 `crud-list.md`·`crud-detail.md`에만 적용 (`data-select-button.md`는 패턴 분기 구조 유지, `page-modal-container.md`는 소폭 보강)
  - 2단계 분리(β): 1차 recipes 재설계 + 이관 표식 + 링크 정비, 2차 API 상세를 `docs/*.md`로 실제 이관. 본 WBS는 양 단계를 모두 Feature로 포함하되, 각 Feature가 **타 세션에서 독립 수행 가능**하도록 분해한다.
  - `crud-list.md` 최소 뼈대 = **조회 전용 page** (busy + topbar + filter + sheet + sorts + pagination + perms(use) + initialized)
  - `crud-detail.md` 최소 뼈대 = **읽기 전용 상세 폼** (busy + topbar + perms(use) + initialized + id input + 데이터 로드 + form 읽기 전용 필드)
  - 확장 표현 = **하이브리드** (각 확장 섹션 = 추가/교체 스니펫 + 포인트 요약; 파일 말미 부록 A = 풀 스택 합본 완성본 1개, 부록 B = 확장 매트릭스 표)
  - 이관 표식 = 해당 블록 직상단 HTML 주석 `<!-- MOVE: docs/{파일}.md#{앵커} -->` + 파일 말미 `## 이관 후보 목록` 체크리스트 섹션 (2차 Feature에서 `[x]` 체크하며 진행)
  - 2차 이관 대상 파일(`docs/ui-*.md`·`docs/utils.md`·`docs/provider-types.md`·`docs/providers.md`)의 선정은 본 WBS 작성 시점의 예측이며, 각 Feature의 **실제 이관 API 목록**은 1차(Feature 1.1·1.2) 완료 후 생성된 `## 이관 후보 목록` 체크리스트로 최종 확정된다.
- **기술적 제약:**
  - 문서는 Markdown(CommonMark) 기반. 코드블록(TypeScript/HTML)은 `packages/angular/CLAUDE.md`의 Component Structure(OnPush + Encapsulation.None + standalone + `input()`/`model()`/`host: data-sd-*`) · Naming Conventions · Key Patterns를 준수.
  - 런타임 API 호환성: Chrome 61+ (esbuild 문법 변환만, 런타임 API 폴리필 불가). `WeakRef`/`FinalizationRegistry`/`Proxy` 등 금지. `mark(sig)` 사용 이유가 바로 Proxy 폴리필 불가로 인한 수동 notify.
  - 프로젝트 전체 코딩 규칙 (`.claude/rules/sd-claude-rules.md`): `import type` 필수, `console.*`·`Buffer`·`===` 예외(`== null` 허용)·`require-await` 등.
  - `sd-options` 규칙 (`.claude/rules/sd-options.md`): Feature 수행 중 의사결정 상황에서 선택지 제시·AskUserQuestion 호출.
- **참조 자료:**
  - `packages/angular/README.md:1-467` — API 카탈로그 + 앱 컨벤션 (Features 섹션 159-164·327-328 링크 갱신 대상)
  - `packages/angular/CLAUDE.md` — 패키지 내부 개발 컨텍스트 (Component Structure·Naming·Composable Utilities 규칙 준수 참고)
  - `packages/angular/docs/recipes/crud-list.md:1-1176` — 현행 CRUD 리스트 레시피 (Feature 1.1 재설계 대상)
  - `packages/angular/docs/recipes/crud-detail.md:1-871` — 현행 CRUD 상세 폼 레시피 (Feature 1.2 재설계 대상)
  - `packages/angular/docs/recipes/page-modal-container.md:1-178` — 페이지/모달 분기 레시피 (Feature 1.3 보강 대상)
  - `packages/angular/docs/recipes/data-select-button.md:1-318` — 선택 버튼 레시피 (Feature 2.1 크로스 참조 갱신 대상, 내용 재설계 없음)
  - `packages/angular/docs/ui-data.md:1-333` — Feature 3.1 이관 대상 (`<sd-sheet>` 계열)
  - `packages/angular/docs/ui-form.md:1-502` — Feature 3.1 이관 대상 (`<sd-form>`·폼 컨트롤)
  - `packages/angular/docs/ui-layout.md:1-140` — Feature 3.1 이관 대상 (`<sd-dock>` 계열)
  - `packages/angular/docs/ui-overlay.md:1-157` — Feature 3.1 이관 대상 (`<sd-busy-container>`)
  - `packages/angular/docs/ui-navigation.md:1-303` — Feature 3.1 이관 대상 (`<sd-topbar>` 계열)
  - `packages/angular/docs/utils.md:1-244` — Feature 3.2 이관 대상 (`inject*`·`setup*`·`mark`)
  - `packages/angular/docs/provider-types.md:1-283` — Feature 3.3 이관 대상 (`SdSelectModal<T>`·`SelectModalOutputResult`·`SdModalContentDef<R>`)
  - `packages/angular/docs/providers.md:1-379` — Feature 3.3 이관 대상 (`SdToastProvider.try`·`SdModalProvider.showAsync`·`SdFileDialogProvider.showAsync`)
  - `.claude/rules/sd-claude-rules.md` — 프로젝트 룰
  - `.claude/rules/sd-options.md` — 선택지 제시 규칙

## Impact Mapping

- **Goal:** `@simplysm/angular` 레시피·API 문서의 진입점→세부 경로가 양방향 링크로 연결되고, 소비 앱 Claude/개발자가 목표 화면 복잡도에 맞는 **최소 뼈대 + 필요한 확장만** 명확히 선택·조립할 수 있다. 풀 옵션 baseline에서 "빼야 할 코드"를 추적하는 부담을 제거한다.
  - **Actor:** 소비 프로젝트의 Claude LLM (화면 조립 주체)
    - **Impact:** CRUD 리스트 화면 조립 시 §3(최소 = 조회 전용 page)부터 시작해 필요한 확장 섹션만 추가로 인용한다 (현재: 풀 옵션 §3에서 제거할 코드를 추측 판정)
      - **Deliverable:** D1. `crud-list.md` "최소 → 확장 누적" 구조 재설계
    - **Impact:** CRUD 상세 폼 화면 조립 시 §3(최소 = 읽기 전용 상세 폼)부터 시작해 필요한 확장만 추가로 인용한다
      - **Deliverable:** D2. `crud-detail.md` "최소 → 확장 누적" 구조 재설계
    - **Impact:** modal 용도(선택 모달 / 조회 전용 modal)를 혼동하지 않고 적절한 계약을 부착한다 (`SdSelectModal<T>` 계약을 반사적으로 이식하지 않는다)
      - **Deliverable:** D3. `page-modal-container.md`에 modal 용도(선택 / 조회 전용) 구분 반영
    - **Impact:** 개별 API 단독 사용법이 궁금할 때 recipes 대신 `docs/*.md`에서 바로 찾는다
      - **Deliverable:** D4. recipes에 혼재한 개별 API 상세를 `docs/*.md` 해당 섹션으로 이관하고, recipes는 링크로 축약
  - **Actor:** simplysm 내부 개발자·유지보수자
    - **Impact:** 레시피 구조가 단순·일관해 향후 추가 확장·유지보수 시 수정 위치가 명확하다
      - **Deliverable:** D1, D2 (동일 원칙·표현으로 쌍이 일관됨)
    - **Impact:** 전체 문서 진입점이 명확하여 소비 앱 Claude·독자가 헤매지 않는다
      - **Deliverable:** D5. `README.md` Features 섹션 링크 문구 "조립 흐름" 관점으로 갱신 + recipes 간 상호 참조 링크 정합성 정비

## Feature Breakdown

### Epic 1. 레시피 재설계 (recipes)

#### [x] Feature 1.1 crud-list.md "최소 → 확장 누적" 재설계

**의존성:** 없음

**범위:**

- §3 "완성 예제"를 **조회 전용 page 최소 뼈대**로 교체:
  - DI: `AppOrmProvider`, `SdToastProvider`
  - 권한: `perms(["{도메인 viewCode}"], ["use"])` + `@if (!perms.use) 경고` 블록
  - 상태: `busyCount`, `initialized`, `items`, `page`, `pageLength`, `sortingDefs`, `filter`, `lastFilter`
  - 템플릿: `<sd-busy-container>` → `@if (initialized)` → `@if (!perms.use) 경고` else: `<sd-topbar-container><sd-topbar> 새로고침 버튼만 </sd-topbar><sd-dock-container><sd-dock>필터(검색어 1개)</sd-dock><sd-sheet ...>읽기 전용 셀</sd-sheet></sd-dock-container></sd-topbar-container>`
  - 메서드: `onFilterSubmit`, `onRefreshButtonClick`, `_refresh`, `_search`, `trackByFn`
  - 생성자 effect: `perms`/`lastFilter`/`page`/`sortingDefs` 의존성 + `untracked(async)` 초기 로드 + `initialized.set(true)`
- §2 "언제 사용하는가" 비교표 재작성 — 각 확장 단계가 필요한 상황을 row로
- 확장 섹션 구성 (각 §에 추가/교체 스니펫 + 포인트 bullet + `<!-- MOVE: ... -->` 표식):
  - 확장 A: + inline 편집/저장 (`canEdit` / `diffs = computed(items.oneWayDiffs(_itemsSnapshot, "id"))` / `_itemsSnapshot` / `onSubmit` / `_upsertItem` / `hostDirectives.sdSaveCommand` / `host: (sdSaveCommand)=...` / 저장·등록 버튼 / `<sd-textfield [inset]="true" [size]="'sm'" [readonly]="!edit">` 편집 셀)
  - 확장 B: + 선택 기능 + 선택 삭제/복구 (`selectedItems` / `hasSelectedDeleted` / `hasSelectedNotDeleted` / `onToggleDeleteItemsButtonClick(del)`)
  - 확장 C: + inline 삭제 열 (시트 맨 앞 `[fixed]="true"` 컬럼 + `<sd-anchor>` 토글)
  - 확장 D: + 선택 모달 전환 (`implements SdSelectModal<T>` / `selectMode` input / `selectedItemKeys` input + 복원 effect / `close` output / modal 하단 `[position]="'bottom'"` 바(선택 해제·확인) / `cumulativeSelection` / `viewType()` 분기)
  - 확장 E: + 조회 전용 modal (부모 식별자 input 예: `customerId = input.required<number>()` / `_search` where절에 부모 식별자 반영 / 초기 effect 의존성에 input 추가 / 하단 바·SdSelectModal 계약 없음 / 닫기 = SdModal 기본 "X")
  - 확장 F: + 모달 편집 모드 (inline 편집 제거 + 이름 열을 `<sd-anchor>`로 교체 + `onEditItemButtonClick` + `_sdModal.showAsync({ type: EditModal, inputs: { itemId } })` + 결과 있으면 `_refresh`)
  - 확장 G: + 엑셀 업로드/다운로드 (`ExcelWrapper` + `zod` 스키마 + `downloadBlob` + `SdFileDialogProvider.showAsync(false, ".xlsx")` + `_search(false)` 전체 조회)
- 부록 A "풀 스택 합본 완성본": 모든 확장 누적한 최종 컴포넌트 1개 (복사 시작점. ~700~900줄)
- 부록 B "확장 매트릭스 표": 각 확장이 추가/변경하는 항목을 열별로 정리 (imports / DI / input·output / 상태 / computed / effect / 메서드 / hostDirectives / host / 템플릿 블록)
- 주의사항 섹션을 확장 레이어별로 재배치 — 예: "`cumulativeSelection` 의도" 주의는 확장 D 내부에, "`oneWayDiffs`는 delete를 다루지 않음" 주의는 확장 A 내부에
- 레시피 관용 규칙 3개 유지 (시트 셀 `[inset]`·`[size]` / `mark`는 UI 동기화 / `sortingDefs.orderBy` string overload)
- MOVE 표식 적용:
  - `<sd-sheet>`/`<sd-sheet-column>`/`[cell]`/`let-edit`/`[cumulativeSelection]`/`getItemCellStyleFn` → `<!-- MOVE: docs/ui-data.md#sd-sheet -->`
  - `<sd-dock>`/`<sd-dock-container>`/position → `<!-- MOVE: docs/ui-layout.md#sd-dock -->`
  - `<sd-form>`/`(formSubmit)`/`requestSubmit`/`<sd-textfield>`/`<sd-anchor>`/`<sd-button>`/`<sd-checkbox>`/`<sd-shared-data-select>` → `<!-- MOVE: docs/ui-form.md#... -->`
  - `<sd-busy-container>` → `<!-- MOVE: docs/ui-overlay.md#sd-busy-container -->`
  - `<sd-topbar>`/`<sd-topbar-container>` → `<!-- MOVE: docs/ui-navigation.md#sd-topbar -->`
  - `injectViewTypeSignal`/`injectPermsSignal`/`injectViewTitleSignal`/`setupCanDeactivate`/`mark` → `<!-- MOVE: docs/utils.md#... -->`
  - `SdSelectModal<T>`/`SelectModalOutputResult` → `<!-- MOVE: docs/provider-types.md#sd-select-modal -->`
  - `SdToastProvider.try`/`SdModalProvider.showAsync`/`SdFileDialogProvider.showAsync` → `<!-- MOVE: docs/providers.md#... -->`
- 파일 말미 `## 이관 후보 목록` 섹션 — 위 MOVE 표식을 대상 파일별로 그룹화한 체크리스트 (2차 Feature 3.x에서 `[x]` 체크)
- 상단 "뷰 범위 + modal 용도 확인 선행" CRITICAL 블록을 유지(현행 톤 유지)하되, 용도 분류가 확장 D·E에서 각각 다뤄진다는 안내 보강

**경계:**

- 개별 API 단독 사용법 상세 서술은 범위 아님 (Feature 3.x에서 `docs/*.md`로 이관)
- `crud-detail.md` 재설계 범위 아님 (Feature 1.2)
- `data-select-button.md` 변경 범위 아님 (Feature 2.1 크로스 참조 갱신만)
- `page-modal-container.md` 변경 범위 아님 (Feature 1.3)

**근거:**

- Impact Mapping Deliverable: D1
- 사용자 답변 (2026-04-21): 최소 뼈대 = 조회 전용 page (옵션 1), 표현 = 하이브리드 (옵션 C)
- 현행 파일: `packages/angular/docs/recipes/crud-list.md:1-1176`
- 참조: `packages/angular/CLAUDE.md` Component Structure·Naming·Composable Utilities (코드 예제 작성 시 준수)

**Feature 1.1 설계 결정 (2026-04-21, sd-plan 세션):**

- D1 §1 Overview: **최소 뼈대 기준 축약** + 확장별 요소는 각 확장 섹션에서 명시
- D2 §4 분해 설명: **최소 뼈대 기준 재작성** + 확장별 분해는 각 확장 섹션의 "포인트" bullet에 흡수
- D3 §9 뷰 타입 분기: **표 유지 + bullet 4개는 각 확장(A/D/E) 링크로 축소**
- D4 **테스트 미작성** (문서 작업, 사용자 명시)
- Feature 1.2/1.3 작성 시 동일 구조를 따르려면 위 D1~D3과 하이브리드 표현(스니펫 + 포인트) / 부록 A·B / MOVE 표식 / 이관 후보 목록 포맷을 참조

상세: [1.1-crud-list-recipe-redesign.md](./1.1-crud-list-recipe-redesign.md)

---

#### [x] Feature 1.2 crud-detail.md "최소 → 확장 누적" 재설계

**의존성:** 1.1 (이유: 하이브리드 표현 포맷·부록 구성·확장 매트릭스·MOVE 표식 형식이 Feature 1.1에서 정립되고 1.2가 그 구조를 답습한다. 결정 파급 관계)

**범위:**

- §3 "완성 예제"를 **읽기 전용 상세 폼 최소 뼈대**로 교체:
  - DI: `AppOrmProvider`, `SdToastProvider`
  - 권한: `perms(...)` + `@if (!perms.use) 경고`
  - 상태: `busyCount`, `initialized`, `data` (로드된 단일 레코드)
  - input: `id` (레코드 식별자)
  - 템플릿: `<sd-busy-container>` → `@if (initialized)` → `@if (!perms.use) 경고` else: `<sd-topbar-container><sd-topbar> 새로고침만 </sd-topbar><sd-form> 읽기 전용 필드(<sd-textfield [readonly]="true">) </sd-form></sd-topbar-container>`
  - 메서드: `onRefreshButtonClick`, `_load`, 생성자 effect로 `id` 변경 시 재로드
- §2 "언제 사용하는가" 비교표 재작성
- 확장 섹션 구성 (하이브리드 표현):
  - 확장 A: + 편집/저장 (`canEdit` / `_dataSnapshot = obj.clone(data)` + `obj.equal(data, _dataSnapshot)` 변경 감지 / `onSubmit` / `_upsert` / `hostDirectives.sdSaveCommand` / 저장 버튼 / `setupCanDeactivate` / 필드 `[readonly]="false"`·`[disabled]="!canEdit()"`로 전환)
  - 확장 B: + 삭제/복구 토글 (`isDeleted` 플래그 토글 + 삭제·복구 버튼)
  - 확장 C: + modal 뷰 (`implements SdModalContentDef<R>` / modal 하단 액션 바(확인·취소·삭제·복구) / `viewType() === "modal"` 분기)
  - 확장 D: + control 뷰 (마스터-디테일의 디테일 영역 / `viewType() === "control"` 분기 / 상단 도구 바)
  - 확장 E: + 보조 기능 영역 (메인 폼 외 별도 action — 가져오기·출력 등. 현행 §5 "보조 기능 영역"의 내용을 스니펫 + 포인트로 재구성)
  - 확장 F: + 복합 상세 — 내부 `<sd-sheet>`로 하위 컬렉션 편집 (현행 §6 내용을 스니펫 + 포인트로 재구성)
- 부록 A: 풀 스택 합본 완성본 1개
- 부록 B: 확장 매트릭스 표 (Feature 1.1과 동일 포맷)
- 주의사항·레시피 관용 규칙 확장 레이어별 재배치
- MOVE 표식 적용 (Feature 1.1과 동일 대상 규칙)
- 파일 말미 `## 이관 후보 목록` 체크리스트
- 상단 "뷰 범위 확인 선행" CRITICAL 블록 유지 + 확장 C·D에서 뷰별 분기 처리됨을 안내

**경계:**

- `crud-list.md` 재설계 범위 아님 (Feature 1.1)
- 개별 API 상세 이관은 범위 아님 (Feature 3.x)
- `page-modal-container.md` modal 용도 구분은 Feature 1.3

**근거:**

- Impact Mapping Deliverable: D2
- 사용자 답변 (2026-04-21): 최소 뼈대 = 읽기 전용 상세 폼 (옵션 A)
- 현행 파일: `packages/angular/docs/recipes/crud-detail.md:1-871`
- 참조: Feature 1.1 결과 (하이브리드 표현·부록·MOVE 표식 형식)

**Feature 1.2 설계 결정 (2026-04-21, sd-plan 세션):**

- D5' 최소 뼈대 = 읽기 전용 상세 폼 (page 뷰 전용): topbar(새로고침) + form(readonly 필드) + lastModified 조건부 렌더 + itemId input + `_refresh` + itemId 변경 effect
- D6 최소 뼈대에 `lastModifiedAt`/`lastModifiedBy` 감사 필드 **포함** (조건부 렌더): 현행 `crud-detail.md:234-247`의 자연스러운 연장. MyInfoPage.ts:177-187 참조 (form 내부 하단)
- D7 최소 뼈대에 viewType 분기 **제외**: `injectViewTypeSignal()` 미호출, `<sd-topbar>` 조건 없이 렌더. 확장 C/D에서 `injectViewTypeSignal()` 신규 도입 + 기존 `<sd-topbar>` 래핑 ("교체" 스니펫). 근거: 사용자 답변 "최소뼈대면 viewType 안쓰는게 맞지 않나 MyInfoPage.ts 이거처럼"
- D8 확장 A~F 구조 = 누적 + 분기 병행: A(←최소) → B(←A) → {C(←A+B, modal 뷰 분기) ∥ D(←A+B, control 뷰 분기, C와 병행 가능)}, E(←A, 보조 기능), F(←A, 복합 상세). 부록 A 풀스택 합본은 A+B+C+D 기준 (3뷰 지원 + 편집/저장 + 삭제/복구). E·F는 각 섹션 스니펫으로만 참조
- D9 현행 §7 뷰 타입 분기: 표 유지 + 특화 bullet 4개는 확장 C(modal)/D(control) 링크로 축소 (Feature 1.1 D3와 대칭)
- D10 확장 A `canEdit = computed(() => perms().includes("edit"))` (viewType 제약 없음 — 편집은 모든 뷰에서 가능)
- D4' 테스트 미작성 (사용자 명시: "문서작업이라 테스트는 없이 하면됨")
- Feature 1.3 작성 시 동일 패턴을 따르려면 위 결정과 하이브리드 표현(스니펫 + 포인트) / 부록 A·B / MOVE 표식 / 이관 후보 목록 포맷을 참조

상세: [1.2-crud-detail-recipe-redesign.md](./1.2-crud-detail-recipe-redesign.md)

---

#### [x] Feature 1.3 page-modal-container.md modal 용도(선택/조회) 구분 반영

**의존성:** 1.1 (이유: crud-list 확장 D(선택 모달) / 확장 E(조회 전용 modal)에서 modal 용도 구분 계약을 먼저 정립하며, 1.3이 이 구분을 공통 레시피에 인용·요약)

**범위:**

- §2 "언제 사용하는가" 비교표의 "모달 뷰" 행을 두 행으로 분리:
  - "다른 화면에서 항목을 고르는 선택 모달 (`SdSelectModal<T>` 구현)" → 모달 블록 + 하단 액션 바
  - "부모 레코드의 자식 목록·이력을 input으로 받아 조회만 하는 modal" → 모달 블록, `SdSelectModal<T>` 계약 없음, 닫기는 SdModal 기본 "X"
- §3 "완성 예제" 상단 서두(또는 해당 `@else if (viewType() === "modal")` 블록 직전)에 "modal 용도 2종" 간단 설명 1~2 문장 추가 — `SdSelectModal<T>` 계약 존재 여부가 용도 구분점임을 명시하고, 상세는 `crud-list.md`/`crud-detail.md` 해당 확장 참조하도록 링크
- §7 "주의사항"에 "modal = 반드시 선택 모달 아님" 경고 1개 추가 (내용은 `crud-list.md` 주의사항과 일관된 워딩이되 중복 없이 요약 + 링크)
- `crud-list.md`·`crud-detail.md` 링크 갱신 (§ 번호·섹션명이 Feature 1.1/1.2 재설계로 변경됨)

**경계:**

- 전면 재설계 아님 (파일 이미 178줄로 간결, 소폭 보강만 +20~30줄)
- 개별 API 이관 범위 아님

**근거:**

- Impact Mapping Deliverable: D3
- 사용자 이전 지시 (2026-04-21, β 선택 시): "page-modal-container는 이미 간결, modal 용도 구분만 반영"
- 현행 파일: `packages/angular/docs/recipes/page-modal-container.md:1-178`

**Feature 1.3 설계 결정 (2026-04-21, sd-plan 세션):**

- D1 테스트: **미작성** (문서 작업, 사용자 명시)
- D2 §3 "modal 용도 2종" 안내 위치: `@else if (viewType() === "modal")` 블록 **직전 HTML 주석** (코드 복사 시 경고가 따라감)
- D3 §2 비교표 분리 범위: (b) "모달 뷰만 필요" **1행을 선택/조회 전용 2행으로 분리**, (a) "페이지·모달 재사용" 행은 유지 + "modal 용도는 아래 두 행 중 하나 확정" 안내 추가
- D4 **편집 모달(crud-detail.md modal 뷰)은 본 Feature 범위 제외** — 2종(선택/조회 전용)만 반영. 편집 모달 용도 분류는 Feature 2.1에 위임
- D5 **crud-detail.md 링크 본 Feature 범위 제외** — 178라인의 기존 파일 수준 참조만 유지. 앵커 수준 링크 추가 금지. Feature 2.1에서 일괄 정비
- D6 §7 주의사항 워딩: **요약(1~2문장) + crud-list.md §13.1 크로스 링크** (워딩 복제 금지)
- 크로스 참조 앵커: `#8-확장-d-선택-모달-전환` / `#9-확장-e-조회-전용-modal` / `#modal-뷰--반드시-선택-모달인-것은-아니다` (= 기호 제거, 공백 2개 연속 → 하이픈 2개 연속)

상세: [1.3-page-modal-container-modal-purpose.md](./1.3-page-modal-container-modal-purpose.md)

---

### Epic 2. 진입점·연결 정비

#### [x] Feature 2.1 README.md Features 섹션 갱신 + recipes 전반 크로스 참조 정비

**의존성:** 1.1, 1.2, 1.3, 3.1, 3.2, 3.3 (이유: recipes 재설계로 § 번호·섹션명 변경이 완료되고, docs/*.md 확장으로 recipes에서 가리키는 앵커가 실제로 docs에 존재하게 된 뒤에 최종 링크 정합성을 점검해야 함)

**범위:**

- `packages/angular/README.md` 수정:
  - "Features" 섹션 (현행 158-164) recipes 링크 문구를 "조립 흐름" 관점으로 갱신
    - 기존: `(<sd-sheet>+<sd-form>+필터+페이지네이션+편집 직접 조립)` 같은 API 나열
    - 신규: `(조회 전용 page부터 풀 CRUD 리스트까지 누적 확장 조립)` 같은 구조·흐름 서술
  - "소비 프로젝트 네이밍 규칙" 표 (현행 327-328)의 recipes 링크 앵커 검증 (`.sheet.ts` → `recipes/crud-list.md`, `.detail.ts` → `recipes/crud-detail.md`)
  - 기타 README 본문에 있는 recipes 링크(예: 중간 Notes) 점검
- `packages/angular/docs/recipes/data-select-button.md` 수정:
  - 본문 및 "Cross-reference" 섹션의 `crud-list.md`·`crud-detail.md` 앵커/섹션명을 재설계 후 구조에 맞게 갱신
  - 파일 구조(§1~§7)는 그대로 유지. 링크 문자열만 수정
- recipes 간 상호 참조 링크 정합성 점검:
  - `crud-list.md` ↔ `crud-detail.md` ↔ `page-modal-container.md` ↔ `data-select-button.md` 간 링크가 현재 § 번호·앵커와 일치하는지
- recipes 파일들의 MOVE 표식이 가리키는 `docs/*.md` 앵커가 실제로 Feature 3.1~3.3 완료 후 docs에 존재하는지 검증 (링크 깨짐 방지)

**경계:**

- `data-select-button.md` 내용 재설계 범위 아님 (패턴 3종 구조 그대로 유지, 링크만 수정)
- 개별 API 상세 이관 범위 아님 (Feature 3.x)
- README의 "Installation" / "컴포넌트 비동기 초기화 규칙" / "소비 프로젝트 디렉토리 구조" / "inject 네이밍 컨벤션" / "Usage Examples" 섹션은 구조적 변경 없음 (recipes 링크가 포함되어 있다면 앵커만 검증)

**근거:**

- Impact Mapping Deliverable: D5
- 사용자 답변 (2026-04-21): 옵션 M (data-select-button은 독립 Feature 대신 본 Feature에 흡수)
- 현행 파일: `packages/angular/README.md:1-467`, `packages/angular/docs/recipes/data-select-button.md:1-318`

**Feature 2.1 설계 결정 (2026-04-22, sd-plan 세션):**

- D1 **테스트 미작성** (문서 작업, 사용자 명시)
- D2 README:158 crud-list 링크 문구 → `(조회 전용 page부터 풀 CRUD 리스트까지 누적 확장 조립)` (wbs.md:229 예시)
- D3 README:159 crud-detail 링크 문구 → `(읽기 전용 상세 폼부터 편집/삭제/modal/control 뷰까지 누적 확장 조립)` (동일 패턴)
- D4 README:160 data-select-button 링크 문구 → **변경 불필요** (wbs.md:241 "내용 재설계 범위 아님")
- D5 data-select-button.md:315 깨진 링크 → `"§8 확장 D: 선택 모달 전환"` + 앵커 `#8-확장-d-선택-모달-전환` (crud-list.md:872 현재 헤딩)

상세: [2.1-readme-crossref-integrity.md](./2.1-readme-crossref-integrity.md)

---

### Epic 3. API 상세 이관 (docs/*.md)

> **공통 수행 원칙 (Feature 3.1~3.3 모두 적용):**
>
> 1. Feature 1.1·1.2 완료 후 각 recipes 파일 말미의 `## 이관 후보 목록` 체크리스트에서 **본 Feature가 담당하는 `docs/{파일}.md`로 지정된 항목들**만 추출
> 2. 현행 `docs/{파일}.md`의 기존 섹션 구조를 **유지**하면서, 해당 API의 "사용법 섹션"을 확장·추가 (API별 용례 코드블록 + input/output/메서드 표 + 주의사항)
> 3. 각 API 섹션 끝에 **"실사용 예" 역링크** 추가 — 예: `[crud-list.md 확장 A: inline 편집](../recipes/crud-list.md#확장-a-inline-편집-저장)`, `[crud-detail.md 확장 C: modal 뷰](...)`. 양방향 위키 링크의 핵심
> 4. recipes 파일들(`crud-list.md`·`crud-detail.md`)에서 해당 MOVE 블록을 삭제하거나 "→ [docs/{파일}.md#{앵커}](...) 참조"로 **축약**
> 5. recipes 파일 말미 `## 이관 후보 목록` 체크리스트의 해당 항목을 `[x]`로 체크
> 6. 작업 완료 후 recipes·docs 양쪽 링크 무결성 검증 (앵커 존재, 경로 올바름, 깨진 링크 없음)

#### [x] Feature 3.1 UI 컴포넌트군 API 상세 이관 (ui-data / ui-form / ui-layout / ui-overlay / ui-navigation)

**의존성:** 1.1, 1.2

**범위:** (1차 MOVE 표식에 따라 최종 확정)

- `docs/ui-data.md` 확장 — `<sd-sheet>` 계열:
  - `<sd-sheet>` 주요 input 사용법: `items`, `selectMode`, `selectedItems`, `cumulativeSelection`, `sorts`, `currentPage`, `totalPageCount`, `trackByFn`, `getItemCellStyleFn`
  - `<sd-sheet-column>` 속성: `key`, `header`, `fixed`, `hidden`, `width` 등
  - `<sd-sheet-column>` `[cell]` template context (`let-item`, `let-edit`, `let-index`, `let-depth`) 사용법
  - `<sd-sheet-column>` `#headerTpl` 커스텀 헤더 템플릿 사용법
  - `SdSheetCellContext` 타입 활용
  - **시트 셀 내부 컨트롤의 `[inset]="true" [size]="'sm'"` 규칙** (현행 crud-list §10 "레시피 작성 관용 규칙 #1" 내용을 `<sd-sheet>` 주의사항으로 이관)
- `docs/ui-form.md` 확장 — `<sd-form>`·폼 컨트롤:
  - `<sd-form>` `(formSubmit)` 이벤트, `requestSubmit()` 메서드, `#formCtrl` 템플릿 변수 사용 패턴
  - `<sd-textfield>`: form 내 사용 (타입별 `[type]="'text'"`·`'number'`·`'date'` 등) / 시트 셀 내 사용 (`[inset]="true"`, `[size]="'sm'"`, `[readonly]="!edit"`, `[disabled]`)
  - `<sd-anchor>` 인라인 버튼 + theme(`danger`/`info`/기본)
  - `<sd-button>` theme (`link-*`/`primary`/`danger`/`warning`/`success`/`info`) + `[type]="'submit'"`
  - `<sd-checkbox>` form 내 + 시트 셀 내 사용
  - `<sd-shared-data-select>` + `<ng-template [itemOf]="...">` 패턴 (시트 셀·일반 form 둘 다)
  - 그 외 MOVE 표식이 지시하는 폼 컨트롤 (예: `<sd-numpad>`, `<sd-date-range-picker>` 등)
- `docs/ui-layout.md` 확장 — `<sd-dock>` 계열:
  - `<sd-dock-container>` + `<sd-dock>` 기본 사용 패턴 (상단 필터·도구 바·하단 확인 바의 배치)
  - `<sd-dock>` `[position]` input 값 (`"top"` 기본, `"bottom"`, `"left"`, `"right"`)
  - **"modal 하단 바에 `[position]="'bottom'"` 반드시 명시"** 주의사항 (현행 crud-list §10 "`<sd-dock>` position 누락" 내용 이관)
- `docs/ui-overlay.md` 확장 — `<sd-busy-container>`:
  - `<sd-busy-container>` input: `[busy]`, `[message]`, `[type]` 사용법
  - `busyCount` 카운트 패턴 (호출부에서 `busyCount.update((v) => v + 1)` / `- 1`, `busyCount() > 0`로 busy 표시)
  - `busyMessage` 선택적 사용 패턴 (긴 작업 시)
  - `SdBusyProvider.globalBusyCount` signal과의 관계 (있다면 보강)
- `docs/ui-navigation.md` 확장 — `<sd-topbar>`·`<sd-topbar-container>`:
  - 기본 패턴 (page 뷰에서만 조건부 렌더, modal/control에서 생략)
  - topbar 내부 슬롯 활용 (`<h4>` 제목, 버튼 배치, `<small>` 단축키 표시)
- 각 API 섹션 끝 **"실사용 예" 역링크** (crud-list·crud-detail 기본 예제 및 확장)

**경계:**

- 대상 5개 docs 파일 내 **MOVE 표식 비대상 컴포넌트**(예: `<sd-list>`·`<sd-kanban>`·`<sd-sidebar>`·`<sd-pagination>`·`<sd-tab>`·`<sd-collapse>`·`<sd-modal>`·`<sd-toast>`·`<sd-dropdown>` 등)는 범위 아님
- 각 컴포넌트 내부 구현(행 렌더링 파이프라인, keydown 핸들러, signal 구현 등)은 범위 아님 (외부 사용법만)
- Composable(`inject*`·`setup*`·`mark` 등)은 Feature 3.2 범위
- Provider·계약 타입은 Feature 3.3 범위

**근거:**

- Impact Mapping Deliverable: D4
- 1차 MOVE 표식 (Feature 1.1·1.2 완료 시 확정)
- 현행 파일: `packages/angular/docs/ui-data.md:1-334`, `ui-form.md:1-502`, `ui-layout.md:1-140`, `ui-overlay.md:1-157`, `ui-navigation.md:1-303`

**Feature 3.1 설계 결정 (2026-04-22, sd-plan 세션):**

- D1 **테스트 미작성** (문서 작업, 사용자 명시)
- D2 sd-shared-data-select → **ui-form.md에 신규 섹션 생성** (WBS "확장·추가" + crud-detail.md:1704 "신규 앵커 생성 대상". features.md:61-87 기존 API 참조 상호 참조)
- D3 이관 후보 체크리스트 Feature 번호 → **WBS 기준 통일 수정** (체크리스트의 3.1~3.5를 모두 3.1로. WBS가 source of truth)
- D4 혼합 MOVE 블록 → **Feature 3.1 대상(ui-*.md) MOVE만 축약, utils.md/providers.md MOVE 유지** (WBS 공통 수행 원칙 1번)
- D5 MOVE 축약 형태 → **섹션 서두 MOVE 블록을 축약 링크 목록으로 교체** (WBS 공통 수행 원칙 4번, 기준 패턴: providers.md/utils.md 역링크 형식)
- D6 기존 충실한 콘텐츠(ui-data.md cumulativeSelection, 셀 작성 지침 등) → **역링크만 추가, 중복 콘텐츠 생성 금지**

상세: [3.1-ui-component-api-migration.md](./3.1-ui-component-api-migration.md)

---

#### [x] Feature 3.2 Composable·Utils API 상세 이관 (utils)

**의존성:** 1.1, 1.2

**범위:** (MOVE 표식 기반 최종 확정 완료)

- `docs/utils.md` 확장:
  - `injectViewTypeSignal()`: 호출 시점 제약(NG0203), 자동 판정 규칙, 수동 오버라이드 패턴
  - `injectPermsSignal(viewCodes, keys)`: 시그니처·표·사용 패턴 (신규 섹션)
  - `injectViewTitleSignal()`: 사용 패턴
  - `injectCurrentPageCodeSignal()` / `injectFullPageCodeSignal()`: 사용 패턴 (modalOrPageTitle 계산 용도)
  - `setupCanDeactivate(guardFn)`: 기본 가드 패턴 + 뷰 타입별 분기 패턴
  - `mark(sig)`: "UI 동기화" 역할 + **"저장 감지가 아니다"** 주의사항 + Chrome 61 이유
- 각 API 섹션 끝 "실사용 예" 역링크
- recipes MOVE 표식을 blockquote 축약 링크로 대체 (crud-list 6건, crud-detail 7건)
- recipes 이관 후보 목록 체크 (`[x]`)

**경계:**

- 각 composable의 내부 구현은 범위 아님 (외부 시그니처·사용 패턴만)
- UI 컴포넌트는 Feature 3.1 범위
- Provider·계약 타입은 Feature 3.3 범위
- `useSelectionManager`/`useSortingManager`/`useExpandingManager`는 MOVE 표식 없음 → 범위 외
- `setSafeStyle`/`injectSdSystemConfigResource`/`setupBgTheme`/`setupRipple` 등 MOVE 비대상은 범위 외

**근거:**

- Impact Mapping Deliverable: D4
- 1차 MOVE 표식 (Feature 1.1·1.2 완료 시 확정)
- 현행 파일: `packages/angular/docs/utils.md:1-244`

**Feature 3.2 설계 결정 (2026-04-22, sd-plan 세션):**

- D1 `injectPermsSignal` 이관 대상: **utils.md** (providers.md 대신). `inject*` 네이밍 컨벤션 일관성. recipes MOVE 표식·이관 후보 목록 수정 포함
- D2 MOVE 주석 블록 처리: **blockquote 축약 링크로 대체** (`> 상세: [API명](../utils.md#앵커)`)
- D3 테스트: **미작성** (문서 작업, 사용자 명시)
- D4 `injectPermsSignal` utils.md 배치: `## Page Code / View Signals` 섹션, `### injectViewTypeSignal` 이후
- D5 `useSelectionManager`/`useSortingManager`/`useExpandingManager`: **제외** (MOVE 표식 없음)

상세: [3.2-composable-utils-api-migration.md](./3.2-composable-utils-api-migration.md)

---

#### [x] Feature 3.3 Provider·계약 타입 API 상세 이관 (provider-types + providers)

**의존성:** 1.1, 1.2

**범위:** (MOVE 표식에 따라 최종 확정)

- `docs/provider-types.md` 확장 — 모달 계약 타입:
  - `SdSelectModal<T>` 인터페이스 구현 방법:
    - `selectMode = input<"single" | "multi" | undefined>()`
    - `selectedItemKeys = input<(keyType)[]>([])`
    - `close = output<SelectModalOutputResult<T> | undefined>()`
    - 복원 effect 패턴 (keys → selectedItems)
    - 선택 해제·확인 하단 바 패턴
  - `SelectModalOutputResult<T>` 구조 (`selectedItemKeys`, `selectedItems`, `filterExists()`로 `undefined` 제거 — index fallback 금지)
  - `SdModalContentDef<R>` 인터페이스 구현 방법 (modal 하단 액션 slot, `close.emit(result)`)
  - **선택 모달 vs 조회 전용 modal 용도 구분** 서술 (recipes와 일관된 워딩)
- `docs/providers.md` 확장 — Provider 메서드:
  - `SdToastProvider.try(fn, messageFn?)` 에러 래퍼 사용법 (반환 타입, 에러 시 자동 토스트)
  - `SdModalProvider.showAsync({ type, inputs, title, ... }, options?)` 호출 패턴:
    - 선택 모달 호출 예 (`inputs: { selectMode, selectedItemKeys }`, 반환값으로 `SelectModalOutputResult<T>` 처리)
    - 조회 전용 modal 호출 예 (`inputs: { parentId }`, 반환값 미사용)
  - `SdFileDialogProvider.showAsync(multiple, accept)` 호출법 (엑셀 업로드 등)
- 각 타입·메서드 섹션 끝 "실사용 예" 역링크 (crud-list 확장 D, crud-detail 확장 C 등)

**경계:**

- 타입 정의 자체의 상세 필드 설명(기존 provider-types.md 본래 역할)은 그대로 유지. 이관되는 것은 **사용 패턴·구현 예제**
- MOVE 표식 비대상 provider(`SdSharedDataProvider`·`SdAppStructureProvider` 등)는 범위 아님
- Provider 내부 구현은 범위 아님
- UI 컴포넌트는 Feature 3.1, Composable은 Feature 3.2 범위

**근거:**

- Impact Mapping Deliverable: D4
- 1차 MOVE 표식 (Feature 1.1·1.2 완료 시 확정)
- 현행 파일: `packages/angular/docs/provider-types.md:1-283`, `providers.md:1-379`

---

## 제외 사항

- **`data-select-button.md` 재설계**: 패턴 3종(직접 사용 / 공유 데이터 / 사용자 정의 wrapper) 분기 구조는 "최소 → 확장 누적" 원칙과 맞지 않음. 크로스 참조만 Feature 2.1에서 갱신. (사유: 사용자 결정 — 옵션 M)
- **`page-modal-container.md` 전면 재설계**: 이미 178줄로 간결하며 "공통 분기 뼈대"라는 구조 자체가 적합. modal 용도 구분만 Feature 1.3에서 보강. (사유: 사용자 이전 지시, 구조 적합성)
- **`docs/bootstrap.md`·`docs/pipes.md`·`docs/plugins.md`·`docs/styling.md`·`docs/type-utilities.md`·`docs/directives.md`·`docs/features.md`·`docs/ui-visual.md` 확장**: 현행 recipes(crud-list·crud-detail)에서 이 파일들로 향하는 MOVE 표식 대상 API가 확인되지 않음. Feature 1.1/1.2 완료 시 실제 MOVE 표식이 예상과 다르게 도출되면, 본 WBS에 Feature 3.4 이후를 추가하는 것을 재검토. (사유: 1차 MOVE 표식 기반 확정 필요)
- **recipes 4개의 단일 파일 통합**: 사용자별 진입점이 다르므로(CRUD 리스트 vs CRUD 상세 vs 페이지/모달 분기 vs 선택 버튼) 분리 유지가 오히려 탐색성이 높음. (사유: 구조 단순화 이점 없음)
- **`packages/angular/src/` 내 TypeScript 코드 수정**: 본 WBS는 문서 작업만 다룸. API 동작·시그니처 변경은 범위 외. (사유: Goal/Deliverable 무관)
- **2차 이관 Feature들이 `docs/*.md`에 "recipes 역링크"를 추가할 때, `docs/*.md`의 본래 역할(API 카탈로그/참조)을 벗어나는 상세 조립 흐름 서술**: 조립 흐름은 recipes에 남긴다. docs는 "이 API 단독 사용법 + 실사용 예 링크"까지만. (사유: recipes-docs 역할 분담)

## 자가검증 (Self-Refine)

### Feature 크기

- **Feature 1.1** (crud-list 재설계): 범위 항목 15~20개(§3 재작성 + 7개 확장 + 부록 A·B + 주의사항 재배치 + 관용 규칙 유지 + MOVE 표식 + 이관 후보 목록). 한 파일 재설계라는 **단일 책임**으로 응집되며, 확장 A~G가 서로 연쇄 의존(확장 B가 확장 A의 canEdit·snapshot 위에 선택 상태를 얹음 등)이라 분할 시 의존성 폭증. **분할하지 않음.**
- **Feature 1.2** (crud-detail 재설계): 동일 사유로 분할하지 않음.
- **Feature 1.3**: 소폭 보강 (+20~30줄). 적정.
- **Feature 2.1**: README + data-select-button + recipes 간 링크라는 다파일 편집이지만 "링크 정합성 정비"라는 단일 책임. 적정.
- **Feature 3.1~3.3**: 주제 기준 재그룹 (3.1 UI 컴포넌트군 / 3.2 Composable·Utils / 3.3 Provider·계약 타입). 공통 수행 원칙 6단계가 동일해 파일 경계로 8분할 시 보일러플레이트·recipes 다중 편집 리스크가 컸으므로 역할 경계로 통합. 각 Feature는 단일 책임(해당 역할군 API의 사용법 이관)으로 응집되며 recipes 편집은 Feature당 1회로 수렴. 3.1이 5개 docs 파일을 다루지만 대상 컴포넌트의 외부 사용법 한정이라 적정.

### 의존성 매트릭스

| Feature | 의존 대상 |
|---------|----------|
| 1.1 | 없음 |
| 1.2 | 1.1 |
| 1.3 | 1.1 |
| 3.1 | 1.1, 1.2 |
| 3.2 | 1.1, 1.2 |
| 3.3 | 1.1, 1.2 |
| 2.1 | 1.1, 1.2, 1.3, 3.1, 3.2, 3.3 |

- **순환 없음** ✓ (1차 → 2차 → 최종 링크 감사로 단방향)
- **의존성 없는 Feature 존재** ✓ (Feature 1.1)

### Feature-Deliverable 역추적

- 1.1 → D1 ✓
- 1.2 → D2 ✓
- 1.3 → D3 ✓
- 2.1 → D5 ✓
- 3.1, 3.2, 3.3 → D4 ✓

모든 Feature가 Impact Mapping Deliverable에 역추적됨 ✓

### 독립성·단일 책임

- 각 Feature 이름과 실제 범위 일치 ✓
- Actor 기준 분할 없음 (Actor는 "소비 앱 Claude"와 "내부 개발자" 둘이지만 Feature가 Actor별로 쪼개져 있지 않음) ✓
- 레이어·패키지 분할 없음 (문서 작업이므로 해당 없음) ✓

### 명명·범위 일관성

- Epic 분류가 사용자 관점 기능 영역(레시피 재설계 / 진입점 정비 / API 상세 이관) 기반 ✓
- Feature 이름이 "결과물 + 내용" 형식으로 구체적 ✓

### 검증 가능성

- 각 Feature 범위가 구체적 산출물(파일 섹션, 스니펫, 표, MOVE 표식, 링크) 기준으로 기술됨 ✓
- 완료 판정 가능: "해당 파일이 Feature 범위대로 수정되었는지"로 판단

## 수행 순서

### 1단계 (독립)

- **Feature 1.1**: crud-list.md 재설계

### 2단계 (병렬 수행 가능, ← 1.1)

- **Feature 1.2**: crud-detail.md 재설계 (← 1.1)
- **Feature 1.3**: page-modal-container.md modal 용도 구분 반영 (← 1.1)

### 3단계 (병렬 수행 가능, ← 1.1, 1.2)

- **Feature 3.1**: UI 컴포넌트군 API 상세 이관 (ui-data/ui-form/ui-layout/ui-overlay/ui-navigation) (← 1.1, 1.2)
- **Feature 3.2**: Composable·Utils API 상세 이관 (utils) (← 1.1, 1.2)
- **Feature 3.3**: Provider·계약 타입 API 상세 이관 (provider-types + providers) (← 1.1, 1.2)

### 4단계 (← 1.1, 1.2, 1.3, 3.1~3.3)

- **Feature 2.1**: README.md Features 섹션 갱신 + recipes 전반 크로스 참조 정비 (최종 링크 정합성 감사 포함)

> **참고:** Feature 1.3은 2단계에서 1.2와 병렬 진행 가능하지만, Feature 2.1이 1.3 결과까지 기다려야 하므로 2.1은 마지막 단계에 배치된다. 3단계의 3.1~3.3은 대상 `docs/*.md` 파일군이 서로 겹치지 않으므로(UI / Utils / Provider·계약 타입) 타 세션 병렬 수행 가능. 단 recipes 파일(`crud-list.md`·`crud-detail.md`)의 MOVE 블록 축약·이관 후보 체크리스트 업데이트는 3 Feature가 공유하므로, 동일 recipes 파일을 동시 편집하지 않도록 조율 필요.
