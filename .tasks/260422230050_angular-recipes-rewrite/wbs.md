# WBS: packages/angular/docs/recipes 재작성

## 프로젝트 개요

- **배경:** `.claude/skills/sd-claude-docs/references/package-docs.md`가 LLM 매뉴얼 원칙(T1/T3 템플릿, ❌/✅ 대비, 1-level deep, self-contained, anti-pattern 우선, 3인칭 서술 등)으로 개정되었으나, 기존 `packages/angular/docs/recipes/**/*.md` 18개 파일(3539줄)은 구지침 시절 작성되어 신 지침과 정합하지 않는다.
- **환경:** pnpm 모노레포 `simplysm`, `packages/angular` 패키지의 소비자 문서는 npm publish 시 `README.md + docs/`로 배포되어 소비 프로젝트의 Claude Code가 `node_modules/@simplysm/angular/docs/**`를 `Read`로 로드해 사용한다.
- **전제조건:**
  - 개정 지침 파일 `package-docs.md` 확정 (완료)
  - 각 recipe 파일의 현행 선행 관계는 파일 헤더 `> **선행:** …` 블록 기준 (재확인 완료)
- **기술적 제약:**
  - 각 recipe가 참조하는 `@simplysm/angular` 소스 API는 실제 현행 소스 기준 (정합성 검증 필수)
  - 1-level deep: 한 recipe에서 다른 recipe로 바로 연결만 허용, 체이닝 금지
- **참조 자료:**
  - `.claude/skills/sd-claude-docs/references/package-docs.md` — T1/T3 템플릿·반-기법·매뉴얼 품질 검증 축
  - `packages/angular/src/**/*` — API 시그니처 정합성 검증용
  - `packages/angular/CLAUDE.md` — 네이밍 컨벤션·패턴 확인용

## Impact Mapping

- **Goal:** 소비 프로젝트의 Claude Code가 `@simplysm/angular`의 recipe 문서만 로드해 CRUD 리스트/상세/선택 버튼/컨테이너 화면 코드를 **첫 시도에** 올바르게 작성한다. 추측·재질문·anti-pattern 회귀를 줄인다.
  - **Actor:** Claude Code (주 독자, LLM 에이전트)
    - **Impact:** 필요한 recipe 한 파일만 로드해도 self-contained하게 코드를 작성한다
      - **Deliverable D1:** 횡단 규칙 문서(`_common-rules.md`)를 T3(Rule) 템플릿으로 재작성
      - **Deliverable D2:** 진입점 recipe 4개(`crud-list`, `crud-detail`, `data-select-button`, `page-modal-container`)를 T1(Recipe) 진입점 템플릿으로 재작성
      - **Deliverable D3:** extension recipe 13개를 T1(Recipe) 확장 템플릿으로 재작성
    - **Impact:** 같은 계열 API·확장 간 선택 기준을 첫 시도에 식별한다 (선택 모달 vs 조회 전용 modal 등)
      - **Deliverable D4:** 각 recipe 상단 "When to use / When NOT to use" 섹션 + 계열 간 선택 기준 명시
    - **Impact:** 자주 틀리는 패턴을 첫 시도에 회피한다
      - **Deliverable D5:** 각 recipe에 ❌/✅ 나란히 블록 형식의 anti-pattern 섹션 수록
  - **Actor:** simplysm 소비 프로젝트 개발자 (2차 독자)
    - **Impact:** 레시피 탐색 시 "어느 파일부터 볼지" 한 번에 파악한다
      - **Deliverable D6:** 횡단 규칙이 `_common-rules.md`에 집중, 진입점 recipe가 extension 인덱스 역할 수행

## Feature Breakdown

### Epic 1. 횡단 규칙 기반

#### [x] Feature 1.1 `_common-rules.md` (T3) 재작성

**의존성:** 없음

**Feature 문서:** [1.1-common-rules-rewrite.md](./1.1-common-rules-rewrite.md)

**범위:**

- 적용 범위 섹션 명시 (recipes 4계열 진입점 + 확장 전반)
- ✅ Always / ⚠️ Ask first / 🚫 Never 3-tier 구조로 기존 규칙 재분류
- 각 규칙에 ❌/✅ 코드 대비 블록 + 근거 1줄 부착
- ~~시간 민감 정보 격리(deprecated 섹션 분리)~~ → 설계결정 D1에 따라 deprecated 섹션 생성하지 않음
- 3인칭 서술 통일
- 예외 케이스 섹션 추가
- **설계결정 D1(plan 단계)**: 기존 "공통 유틸 재도입 금지" 규칙(`useCrudList`/`useDataSheet`/`useCrudDetail`/`useDataDetail`/`setupCumulateSelectedKeys2`/`setupDataDetail` 이름 포함) 섹션 **전체 삭제**. 재도입 금지 경고 자체를 제거한다 (사용자 결정)

**경계:**

- 특정 recipe 고유 규칙은 해당 recipe 내부로 남겨둔다 (횡단 공통만 여기 수록)
- 진입점 recipe의 최소 뼈대 코드는 수록하지 않는다
- 4계열 진입점·확장 파일 수정은 본 Feature 범위 외 (각 Feature 2.x/3.x/4.x 담당)

**근거:**

- Impact Mapping Deliverable: D1, D5
- 소스: `packages/angular/docs/recipes/_common-rules.md` (136줄, 현재 T3 비슷한 형태로 존재하나 3-tier 분류·근거 주석 일부 누락)
- 확인 필요 파일: `packages/angular/docs/recipes/_common-rules.md`

---

### Epic 2. CRUD 리스트 레시피

#### [x] Feature 2.1 `crud-list.md` 진입점 재작성

**의존성:** 1.1

**Feature 문서:** [2.1-crud-list-rewrite.md](./2.1-crud-list-rewrite.md)

**범위:**

- 파일 상단 "When to use / When NOT to use" 작성 (뷰 범위 선택 가이드 포함)
- 최소 뼈대(§3 조회 전용 page) 코드를 엣지케이스 포함해 self-contained로 정리
- 확장 A~G 인덱스 테이블(확장/언제 쓰나/전제/문서 4열)
- `_common-rules.md`로 공통 규칙 위임 (링크 1-level)
- ❌/✅ 주요 anti-pattern 4항목 (modal 반사 부착 / 뷰 분기 분리 블록 / orderBy 람다 회귀 / 테스트용 public API)
- 시그니처·API 참조 소스 정합성 재검증 (완료 — 모두 정합)

**경계:**

- 확장 A~G 각각의 상세 구현은 이 파일에서 다루지 않음 (extension 파일로 위임)
- 공통 규칙 본문은 `_common-rules.md`에 위치, 여기서는 링크만

**설계결정:**

- **D1(plan 단계)**: §4 블록/상태/메서드 3표 삭제, "조건부 요소 포함 기준"만 유지 (의도 설명은 예제 코드 주석으로 보완)
- **D2**: 부록 B 매트릭스 + §5~§11 각 확장 소개 섹션 삭제, 4열 인덱스 테이블로 일원화
- **D3**: §12 "뷰 타입 분기" 표 삭제, When to use 섹션에 뷰 범위 선택 가이드로 통합
- **D4**: 최상단 CRITICAL 블록 제거 → 1줄 포인터(태그 없음), §13.1 상세를 Anti-patterns 섹션으로 이관
- **D5**: §14 규칙 3 "orderBy string overload"를 Anti-patterns 섹션으로 이관

**근거:**

- Impact Mapping Deliverable: D2, D4, D5
- 소스: `packages/angular/docs/recipes/crud-list.md` (519줄)
- 확인 필요: `packages/angular/src/data/sheet/**`, `packages/angular/src/core/selection/**`

---

#### [x] Feature 2.2 `crud-list/extension-a-inline-edit.md` 재작성

**의존성:** 2.1

**Feature 문서:** [2.2-crud-list-extension-a-inline-edit-rewrite.md](./2.2-crud-list-extension-a-inline-edit-rewrite.md)

**범위:**

- sibling diff 스타일 템플릿 정렬(브레드크럼 / 제목 / 선행 / 요약 / 적용 조건 / 도입 요소 / 번호 코드 / 포인트 / 🚫 흔한 실수 / Cross-reference)
- 선행 없음 — 최소 뼈대 §3에 직접 얹는 코드 diff만 유지
- `_upsertItem` / 중복 검사 / 감사 로그 기본 구성 (후속 extension에서 재사용)
- 포인트의 `mark`/`setupCanDeactivate`/`[inset]/[size]` 중복 본문은 공통 규칙 anchor 링크로 위임
- ❌/✅ anti-pattern: `items` 배열 물리 제거 → `oneWayDiffs` delete 미감지(isDeleted 플래그로 대체) 1건 승격

**경계:**

- 선택 기능·삭제 열은 확장 B/C 영역
- 모달 편집 모드(상호 배타)는 확장 F 영역
- 공통 규칙 본문 개정은 Feature 1.1 범위

**설계결정:**

- **D2(plan 단계)**: "inline vs 모달 편집 선택 기준"은 `> **적용 조건:**` 블록쿼트 1~2줄 + 확장 F 링크로 노출 (sibling extension 템플릿 일관성 유지, 사용자 결정)
- **D3(plan 단계)**: `🚫 흔한 실수` 섹션은 `items` 물리 제거 → `oneWayDiffs` delete 미감지 1건만 ❌/✅ 블록으로 승격 (사용자 결정, 반-기법 "섹션 남발" 회피)
- **D4(plan 단계)**: `mark`/`setupCanDeactivate`/`[inset]/[size]` 관련 서술은 공통 규칙 anchor 링크 위임 (중복 본문 제거)

**근거:**

- Impact Mapping Deliverable: D3, D4, D5
- 소스: `packages/angular/docs/recipes/crud-list/extension-a-inline-edit.md` (376줄)

---

#### [x] Feature 2.3 `crud-list/extension-b-selection.md` 재작성

**의존성:** 2.2

**Feature 문서:** [2.3-crud-list-extension-b-selection-rewrite.md](./2.3-crud-list-extension-b-selection-rewrite.md)

**범위:**

- 선행 A에 얹는 diff만 보여주는 구조 유지
- 선택 기능 + 선택 삭제/복구 (soft-delete 전제)
- isDeleted 플래그 도입 지점 명시
- ❌/✅ 신규 행(id==null) 선택 삭제 대상 포함 1건 (사용자 결정 D4 — WBS "useSelectionManager 오용" 레이블을 본 확장 실제 흔한 실수로 재해석)

**경계:**

- 물리 삭제 경로는 이 레시피에서 제외 (공통 규칙 참조)
- inline 삭제 열은 확장 C 영역
- `useSelectionManager` 외부 중복 인스턴스화 anti-pattern은 본 확장에서 다루지 않음 — 본 확장은 `<sd-sheet>`의 selection 계약만 바인딩하며 `useSelectionManager`를 직접 사용하지 않음 (기각, 사용자 결정 D4)

**설계결정:**

- **D4(plan 단계)**: `🚫 흔한 실수` 섹션은 "신규 행(id == null)을 선택 삭제 대상에 포함한다" 1건만 ❌/✅ 블록으로 승격 (사용자 결정, 반-기법 "섹션 남발" 회피)

**근거:**

- Impact Mapping Deliverable: D3, D5
- 소스: `packages/angular/docs/recipes/crud-list/extension-b-selection.md` (181줄)

---

#### [x] Feature 2.4 `crud-list/extension-c-inline-delete.md` 재작성

**의존성:** 2.3

**Feature 문서:** [2.4-crud-list-extension-c-inline-delete-rewrite.md](./2.4-crud-list-extension-c-inline-delete-rewrite.md)

**범위:**

- 선행 A + B에 얹는 diff 구조 (sibling 확장 B/G 정합 번호 단계)
- inline 삭제/복구 열 추가
- isDeleted 토글 UX 명시 (확장 B의 다건 일괄 토글 위에 row별 빠른 토글)
- ❌/✅ 컬럼 `key`를 `"isDeleted"`(언더스코어 prefix 누락)로 사용 1건 승격

**경계:**

- 선택 일괄 삭제는 확장 B가 담당
- `_upsertItem` / `_search`의 `isDeleted` where·upsert 도입은 확장 B 전담
- 확장 F(모달 편집) 배타 관계는 확장 A에서 전파 — 본 확장 Cross-reference 미언급

**설계결정:**

- **D1(plan 단계)**: 🚫 흔한 실수는 "컬럼 key를 `'isDeleted'`(언더스코어 prefix 누락)로 사용 → 서버 정렬·컬럼 지속성 설정과 충돌" 1건만 ❌/✅ 블록으로 승격 (사용자 결정, sibling A/B/G "1건 승격" 패턴 정합)
- **D2(plan 단계)**: 선행은 확장 A + 확장 B 모두 필수 고정 (사용자 결정). `isDeleted`/`selectedItems`/`getItemCellStyleFn` 도입을 확장 B에 위임
- **D3(plan 단계)**: 확장 B와의 관계를 "공존 가능"(독립 세트 암시) 대신 "B의 다건 일괄 토글 위에 row별 빠른 토글을 추가하는 보완 관계"로 재서술 (사용자 결정)
- **D4(plan 단계)**: 확장 F(모달 편집) 배타 관계는 본 파일에서 미언급 (사용자 결정, sibling 확장 B와 일관성 유지. F 배타는 확장 A에서 간접 전파)

**근거:**

- Impact Mapping Deliverable: D3, D5
- 소스: `packages/angular/docs/recipes/crud-list/extension-c-inline-delete.md` (60줄)

---

#### [x] Feature 2.5 `crud-list/extension-d-select-modal.md` 재작성

**의존성:** 2.1

**Feature 문서:** [2.5-crud-list-extension-d-select-modal-rewrite.md](./2.5-crud-list-extension-d-select-modal-rewrite.md)

**범위:**

- "When to use / When NOT to use" — 선택 모달 vs 조회 전용 modal(확장 E) vs 모달 편집(확장 F) 구별 기준 명시
- `implements SdSelectModal<T>` 계약, `selectMode`, `selectedItemKeys`, `close`, `cumulativeSelection` 구현
- ❌/✅ 진입점 "modal 반사 단정" 링크 + 고유 anti-pattern 3건(multi 모드 "선택 해제"가 close emit, `selectedItemKeys` index fallback, `<sd-dock>` `[position]` 생략)

**경계:**

- 조회 전용 modal(부모 레코드 기반)은 확장 E
- 모달 편집(행 클릭→편집 모달)은 확장 F

**설계결정:**

- **D1(plan 단계)**: 독자 관점 선행 체인 = 확장 A + 확장 B 유지 (사용자 결정). 코드가 A의 `canEdit`·`_checkIgnoreChanges`, B의 `selectedItems`·`getItemCellStyleFn`·`isDeleted`·multi 선택을 그대로 재사용
- **D2(plan 단계)**: "modal 반사 단정" anti-pattern은 진입점(crud-list.md)에 이미 수록되므로 링크만 두고 재서술하지 않음
- **D3(plan 단계)**: 고유 anti-pattern 3건을 ❌/✅ 블록 + 근거로 신설

**근거:**

- Impact Mapping Deliverable: D3, D4
- 소스: `packages/angular/docs/recipes/crud-list/extension-d-select-modal.md` (재작성 완료)

---

#### [x] Feature 2.6 `crud-list/extension-e-readonly-modal.md` 재작성

**의존성:** 2.1

**Feature 문서:** [2.6-crud-list-extension-e-readonly-modal-rewrite.md](./2.6-crud-list-extension-e-readonly-modal-rewrite.md)

**범위:**

- "When to use" — 조회 전용 modal 선택 기준
- 부모 식별자 input 기반 자식 목록/이력 조회 패턴
- ❌/✅ signal 초기값에서 input signal 읽기 금지, effect 기반 input 반영

**경계:**

- 선택 계약은 확장 D

**근거:**

- Impact Mapping Deliverable: D3, D4, D5
- 소스: `packages/angular/docs/recipes/crud-list/extension-e-readonly-modal.md` (128줄)

---

#### [x] Feature 2.7 `crud-list/extension-f-modal-edit.md` 재작성

**의존성:** 2.1

**Feature 문서:** [2.7-crud-list-extension-f-modal-edit-rewrite.md](./2.7-crud-list-extension-f-modal-edit-rewrite.md)

**범위:**

- "When to use" — inline 편집(확장 A)과 **상호 배타**임을 명시 (선행 블록쿼트·요약·Anti-patterns 3지점 분산)
- 모달 편집 모드 코드
- ❌/✅ 확장 A와 동시 적용 금지
- 확장 B 병용 시 bulk 삭제 API 전환 스니펫 포인트 불릿 유지 (사용자 결정 D4)

**경계:**

- inline 편집 경로는 확장 A

**근거:**

- Impact Mapping Deliverable: D3, D4
- 소스: `packages/angular/docs/recipes/crud-list/extension-f-modal-edit.md` (110줄)

---

#### [x] Feature 2.8 `crud-list/extension-g-excel.md` 재작성

**의존성:** 2.2

**Feature 문서:** [2.8-crud-list-extension-g-excel-rewrite.md](./2.8-crud-list-extension-g-excel-rewrite.md)

**범위:**

- 선행 A에 얹는 diff (sibling diff 스타일 템플릿 정렬)
- 엑셀 업로드/다운로드 코드 (`_upsertItem` / `_search(false)` / 감사 로그 재사용)
- ❌/✅ 업로드 시 검증 누락 anti-pattern — **zod `optional()` 남용**: 필수 필드를 `z.string().optional()`로 선언하여 `safeParse`가 빈 셀 행을 통과시켜 `_upsertItem`까지 전달 (사용자 결정 D2)

**경계:**

- inline 편집 본체는 확장 A

**설계결정:**

- **D2(plan 단계)**: 🚫 흔한 실수의 ❌/✅ anti-pattern을 "zod `optional()` 남용으로 업로드 검증 우회" 1건으로 구성 (사용자 결정). `_upsertItem` 우회 bulk insert·`getDataTable` 직접 호출 대안은 기각 — 원문에 이미 required vs optional 주석 구분이 있어 zod 스키마 설계가 업로드 유효성의 유일한 방어선임을 선명히 드러냄
- **D3(plan 단계)**: 확장 A 재사용 관계를 선행 블록쿼트·요약·포인트 불릿 3지점에 분산 명시 (확장 A 생략 후 확장 G만 얹는 회귀 방지)

**근거:**

- Impact Mapping Deliverable: D3, D5
- 소스: `packages/angular/docs/recipes/crud-list/extension-g-excel.md` (125줄)

---

### Epic 3. CRUD 상세 레시피

#### [x] Feature 3.1 `crud-detail.md` 진입점 재작성

**의존성:** 1.1

**Feature 문서:** [3.1-crud-detail-rewrite.md](./3.1-crud-detail-rewrite.md)

**범위:**

- "When to use / When NOT to use" (뷰 범위 선택 가이드)
- 최소 뼈대(§3 읽기 전용 상세 폼, page 뷰) self-contained 코드
- 확장 A~F 인덱스 테이블
- `_common-rules.md`로 공통 규칙 위임
- ❌/✅ 추측으로 3뷰 모두 박기 금지

**경계:**

- 확장 A~F 상세는 각 extension 파일에 위임

**근거:**

- Impact Mapping Deliverable: D2, D4, D5
- 소스: `packages/angular/docs/recipes/crud-detail.md` (466줄)
- 확인 필요: `packages/angular/src/controls/form/**`, `packages/angular/src/core/commands/**`

---

#### [x] Feature 3.2 `crud-detail/extension-a-edit-save.md` 재작성

**의존성:** 3.1

**Feature 문서:** [3.2-crud-detail-extension-a-edit-save-rewrite.md](./3.2-crud-detail-extension-a-edit-save-rewrite.md)

**범위:**

- 선행 없음 — 최소 뼈대 §3에 직접 얹기
- 편집/저장 로직, 변경 감지(`_checkIgnoreChanges`, `diffs()`, snapshot)
- ❌/✅ `mark`를 "저장 감지"로 오해하는 anti-pattern (공통 규칙 참조 + 여기서도 1줄 요약)

**경계:**

- 삭제/복구는 확장 B
- modal/control 뷰는 확장 C/D

**근거:**

- Impact Mapping Deliverable: D3, D5
- 소스: `packages/angular/docs/recipes/crud-detail/extension-a-edit-save.md` (200줄)

---

#### [x] Feature 3.3 `crud-detail/extension-b-delete-restore.md` 재작성

**의존성:** 3.2

**Feature 문서:** [3.3-crud-detail-extension-b-delete-restore-rewrite.md](./3.3-crud-detail-extension-b-delete-restore-rewrite.md)

**범위:**

- 선행 A에 얹는 diff (코드 6단계 보존)
- soft-delete 전제 삭제/복구 토글 (동작 변경 없음)
- ❌/✅ 물리 삭제 경로 혼용 금지 Anti-patterns 섹션 1건 승격 (sibling A 포맷 정합)
- 깨진 공통 규칙 anchor 복구 (`#삭제-방식은-db-스키마에-따라-결정한다`)

**경계:**

- isDeleted 컬럼 없는 경우는 이 확장 미사용 (공통 규칙 참조)
- 확장 A 산출물(`busyCount`/`perms`/`_refresh`) 수정 금지

**설계결정:**

- **D1(plan 단계)**: Anti-patterns 수록 1건(물리 삭제 혼용)으로 한정 (사용자 결정, 반-기법 "섹션 남발" 회피)
- **D2(plan 단계)**: 적용 조건 블록쿼트 anchor `#삭제-방식-soft-delete-vs-물리-삭제` → `#삭제-방식은-db-스키마에-따라-결정한다`로 교체 (공통 규칙 L139 헤더 정합)
- **D3(plan 단계)**: ❌ 예시는 같은 컴포넌트에 물리 DELETE + soft-delete 토글을 병행 노출하여 혼용 함정을 시각화
- **D4(plan 단계)**: 포인트 L97 산문 유지, Anti-patterns는 "결정 기준 링크 + 혼용 코드 예시"로 역할 분리

**근거:**

- Impact Mapping Deliverable: D3, D5
- 소스: `packages/angular/docs/recipes/crud-detail/extension-b-delete-restore.md` (101줄)

---

#### [x] Feature 3.4 `crud-detail/extension-c-modal-view.md` 재작성

**의존성:** 3.3

**Feature 문서:** [3.4-crud-detail-extension-c-modal-view-rewrite.md](./3.4-crud-detail-extension-c-modal-view-rewrite.md)

**범위:**

- 선행 A + B에 얹기
- modal 뷰 분기(타이틀 계산, canDeactivate, `<ng-template #modalActionTpl>`)
- ❌/✅ `<sd-dock>` `[position]='bottom'` 누락 Anti-patterns 1건 승격 (설계결정 D1·D8)
- 말미 appendix `## setupCanDeactivate는 뷰 타입에 따라 분기` 제거 및 이관 메모/동어반복 주석 정리 (설계결정 D3·D4·D5)

**경계:**

- control 뷰는 확장 D
- 확장 C 동작 변경(`actionTplRef` 프록시·`setupCanDeactivate` 조건·`close.emit` 시점·template 구조) 금지
- `_common-rules.md`의 `injectViewTypeSignal()` 호출 시점 규칙 재서술 금지 (공통 규칙 1-hop 위임)

**설계결정:**

- **D1(plan 단계)**: Anti-patterns 수록 1건(`[position]='bottom'` 누락)으로 한정 (사용자 결정, 반-기법 "섹션 남발" 회피). 확장 C template 도입 요소 고유 함정을 포인트 L176 산문에서 ❌/✅ 블록으로 승격
- **D3(plan 단계)**: 말미 appendix 전체 삭제 (사용자 결정). 포인트 L178에 modal에서 true 반환 → 이중 confirm 회피 핵심이 이미 수렴. `sd-data-detail.base.ts:99` 깨진 소스 링크 근본 제거
- **D4(plan 단계)**: L24-25 `<!-- MOVE: ... -->` HTML 주석만 제거하고 `SdModalContentDef` / `SdActivatedModalProvider` 참조 링크 2개는 `> 상세:` 형식으로 정합화하여 유지 (사용자 결정)
- **D5(plan 단계)**: L117 template 주석 "viewTitle을 viewTitle로 교체"(동어반복 오탈자) → `(확장 A/B 동일)`로 축약
- **D8(plan 단계)**: WBS 원안 "`injectViewTypeSignal()` 호출 시점" 재해석 — `_common-rules.md:16-30`에 이미 ❌/✅ 블록 존재 → 재서술 회피, 1-hop 링크로 위임

**근거:**

- Impact Mapping Deliverable: D3, D4
- 소스: `packages/angular/docs/recipes/crud-detail/extension-c-modal-view.md` (187줄)
- 소스 정합성 검증: `packages/angular/src/layout/dock/sd-dock.ts:97` (position 기본값 `"top"`), `packages/angular/src/core/modal/sd-modal.provider.ts:140-151` (actionTplRef 프록시), `packages/angular/src/core/routing/injectViewTypeSignal.ts:7-38`, `packages/angular/src/core/routing/setupCanDeactivate.ts:5-42`

---

#### [x] Feature 3.5 `crud-detail/extension-d-control-view.md` 재작성

**의존성:** 3.3

**Feature 문서:** [3.5-crud-detail-extension-d-control-view-rewrite.md](./3.5-crud-detail-extension-d-control-view-rewrite.md)

**범위:**

- 선행 A + B에 얹기
- control 뷰(마스터-디테일 디테일 영역)
- ❌/✅ control 뷰에서 `<sd-topbar-container>` 소유 금지(공통 규칙 참조)

**경계:**

- modal 뷰는 확장 C

**설계결정:**

- **D1(plan 단계)**: Anti-patterns 수록 1건("control 뷰 분기에 자체 `<sd-topbar>` 추가")으로 한정 (사용자 결정 A, 반-기법 "섹션 남발" 회피, sibling 3.3·3.7 선례 일관)
- **D2(plan 단계)**: ❌ 예시는 `@if (viewType() === "control" && canEdit())` 분기 내부 `<sd-topbar>` 배치 / ✅ 예시는 원문 `<sd-dock>` 상단 바 복원 (동일 분기 위치에 회귀 지점 시각화)
- **D3(plan 단계)**: 공통 규칙 `_common-rules.md:32-55` page topbar 소유 규칙은 **재서술 금지**, anchor `#page-컴포넌트가-sd-topbar-container와-sd-topbar를-소유한다`로 1-hop 위임
- **D4(plan 단계)**: `setupCanDeactivate` control no-op / `<sd-dock> [position]` 생략 관련 주의사항은 포인트 불릿 산문 유지, Anti-patterns 섹션 미승격 (사용자 결정 A 범위 외)
- **D5(plan 단계)**: 코드 diff 3단계(imports / 파생 / template) 및 포인트 불릿 4건 **전체 보존** (동작 변경 없음)

**근거:**

- Impact Mapping Deliverable: D3, D5
- 소스: `packages/angular/docs/recipes/crud-detail/extension-d-control-view.md` (67줄)

---

#### [x] Feature 3.6 `crud-detail/extension-e-auxiliary.md` 재작성

**의존성:** 3.2

**Feature 문서:** [3.6-crud-detail-extension-e-auxiliary-rewrite.md](./3.6-crud-detail-extension-e-auxiliary-rewrite.md)

**범위:**

- 선행 A에 얹기
- 보조 기능 영역(첨부·이력 등) 배치 패턴
- `SdSharedDataSelect` + 앱 공용 `useSharedSignal` 도입 (주석으로 소속 명시)
- 보조 `<sd-form>` ↔ 메인 `<sd-form #formCtrl>` 분리(메인 Ctrl+S 경로 독립) 명시
- 포인트에 "`_refresh()` 선두 `_sdSharedData.wait()` 필요" 1-hop 링크

**경계:**

- modal/control 뷰 분기는 이 확장에서 다루지 않음 (뷰 분기는 확장 C/D)
- Anti-patterns(🚫 흔한 실수) 서브섹션 신설은 범위 외

**설계결정:**

- **D2(plan 단계)**: `🚫 흔한 실수` 서브섹션 **미생성** — 주의사항은 포인트 불릿로만 전달 (사용자 결정, WBS에 ❌/✅ 명시 없음, sibling extension-b와 일관성 유지)
- **D4(plan 단계)**: 도메인 예시는 원문의 "권한 복사(`permCopySourceId` + `사용자` shared data)" 유지 (진입점·확장 A의 ICustomer와 별도 도메인)
- **D7(plan 단계)**: 공유 데이터 도입으로 `_sdSharedData.wait()` 조건 전환 → 본문 재서술 금지, 공통 규칙 1-hop 링크만

**근거:**

- Impact Mapping Deliverable: D3
- 소스: `packages/angular/docs/recipes/crud-detail/extension-e-auxiliary.md` (78줄)

---

#### [x] Feature 3.7 `crud-detail/extension-f-complex-detail.md` 재작성

**의존성:** 3.2

**Feature 문서:** [3.7-crud-detail-extension-f-complex-detail-rewrite.md](./3.7-crud-detail-extension-f-complex-detail-rewrite.md)

**설계결정:**

- **D2(plan 단계)**: Anti-patterns는 "`data().boxes` 하위 컬렉션 row 물리 제거 → `oneWayDiffs` delete 미감지" 1건만 ❌/✅ 블록으로 승격 (사용자 결정). WBS 명시의 시트 셀 `[inset]/[size]` 누락은 `_common-rules.md`에 이미 ❌/✅로 존재 → 포인트 링크 1-hop 위임
- **D4(plan 단계)**: 하위 컬렉션 `isDeleted` 플래그가 **상위 테이블 soft-delete 여부와 무관**하다는 점을 포인트 1번에 명시 유지 (기술적 제약은 `oneWayDiffs` delete 미지원)

**범위:**

- 선행 A에 얹기
- 복합 상세(내부 `<sd-sheet>` 포함) 구성
- ❌/✅ 내부 시트 cell에 `[inset]="true" [size]="'sm'"` 누락 금지(공통 규칙 참조)

**경계:**

- 단순 상세 폼은 진입점 최소 뼈대 + 확장 A

**근거:**

- Impact Mapping Deliverable: D3, D5
- 소스: `packages/angular/docs/recipes/crud-detail/extension-f-complex-detail.md` (187줄)

---

### Epic 4. 기타 화면 레시피

#### [x] Feature 4.1 `data-select-button.md` 재작성

**의존성:** 1.1

**Feature 문서:** [4.1-data-select-button-rewrite.md](./4.1-data-select-button-rewrite.md)

**범위:**

- "When to use / When NOT to use" (`<sd-modal-select-button>` 직접 사용 vs 도메인 wrap)
- 직접 사용 코드 + 컴포지션(wrap) 코드 병기
- ❌/✅ 과거 `SdDataSelectButton*` 추상 재도입 금지

**경계:**

- 모달 내부 선택 계약은 `crud-list/extension-d` 참조 (링크)

**근거:**

- Impact Mapping Deliverable: D2, D4
- 소스: `packages/angular/docs/recipes/data-select-button.md` (318줄)
- 확인 필요: `packages/angular/src/controls/button/sd-modal-select-button.ts`

---

#### [x] Feature 4.2 `page-modal-container.md` 재작성

**의존성:** 1.1

**Feature 문서:** [4.2-page-modal-container-rewrite.md](./4.2-page-modal-container-rewrite.md)

**범위:**

- "When to use / When NOT to use" (page/modal/control 3뷰 재사용 컨테이너 구성 시점)
- `<sd-busy-container>` + `<sd-topbar-container>` + `<sd-topbar>` 직접 조립
- ❌/✅ 과거 `<sd-base-container>` 재도입 금지

**경계:**

- 상세폼 뷰 분기는 crud-detail 확장 C/D
- 리스트 뷰 분기는 crud-list 확장 D/E/F

**근거:**

- Impact Mapping Deliverable: D2, D5
- 소스: `packages/angular/docs/recipes/page-modal-container.md` (178줄)
- 확인 필요: `packages/angular/src/layout/dock/**`, `packages/angular/src/layout/topbar/**`

---

## 제외 사항

- `packages/angular/docs/recipes/` 외부 파일 재작성 (예: `docs/providers/**`, `docs/utils/**`, `docs/ui-*/**`) — 현재 플랜 범위 외 (사유: 범위 초과, 별도 플랜 필요)
- `.claude/skills/sd-claude-docs/references/package-docs.md` 추가 개정 — 사유: 방금 확정, 이번 작업은 지침 적용만
- 신규 recipe(새 확장 H 등) 추가 — 사유: 사용자 요청 없음, 기존 파일 재작성만 범위

## 의존성 매트릭스

| Feature | 의존 대상 |
|---------|-----------|
| 1.1 | 없음 |
| 2.1 | 1.1 |
| 2.2 | 2.1 |
| 2.3 | 2.2 |
| 2.4 | 2.3 |
| 2.5 | 2.1 |
| 2.6 | 2.1 |
| 2.7 | 2.1 |
| 2.8 | 2.2 |
| 3.1 | 1.1 |
| 3.2 | 3.1 |
| 3.3 | 3.2 |
| 3.4 | 3.3 |
| 3.5 | 3.3 |
| 3.6 | 3.2 |
| 3.7 | 3.2 |
| 4.1 | 1.1 |
| 4.2 | 1.1 |

- 1단계 Feature 존재: 1.1 ✓
- 순환 의존 없음 ✓
- 모든 Feature가 Impact Mapping Deliverable 역추적 가능 ✓

## 수행 순서

```
1단계 (단독)
  - Feature 1.1: _common-rules.md (T3)

2단계 (병렬 수행 가능, ← 1.1)
  - Feature 2.1: crud-list.md 진입점
  - Feature 3.1: crud-detail.md 진입점
  - Feature 4.1: data-select-button.md
  - Feature 4.2: page-modal-container.md

3단계 (병렬 수행 가능)
  - Feature 2.2: crud-list/extension-a (← 2.1)
  - Feature 2.5: crud-list/extension-d (← 2.1)
  - Feature 2.6: crud-list/extension-e (← 2.1)
  - Feature 2.7: crud-list/extension-f (← 2.1)
  - Feature 3.2: crud-detail/extension-a (← 3.1)

4단계 (병렬 수행 가능)
  - Feature 2.3: crud-list/extension-b (← 2.2)
  - Feature 2.8: crud-list/extension-g (← 2.2)
  - Feature 3.3: crud-detail/extension-b (← 3.2)
  - Feature 3.6: crud-detail/extension-e (← 3.2)
  - Feature 3.7: crud-detail/extension-f (← 3.2)

5단계 (병렬 수행 가능)
  - Feature 2.4: crud-list/extension-c (← 2.3)
  - Feature 3.4: crud-detail/extension-c (← 3.3)
  - Feature 3.5: crud-detail/extension-d (← 3.3)
```

## 다음 단계

`/sd-dev .tasks/260422230050_angular-recipes-rewrite/wbs.md 1.1`
