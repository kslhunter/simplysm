# WBS: @simplysm/angular recipes wiki 스타일 분해

## 프로젝트 개요

- **배경:** `packages/angular/docs/recipes/`의 `crud-list.md`(2,190줄)와 `crud-detail.md`(1,741줄)가 거대한 단일 파일로, "최소 뼈대 + 확장 7개(또는 6개) + 부록 + 주의사항 + 이관 후보"가 한 파일에 몰려 있다. 소비 앱 Claude/개발자가 조회 전용 페이지를 만들려 해도 2,190줄 파일 전체를 context에 올려야 한다. wiki 스타일("큰 그림 → 작은 그림으로 점점 확장, 필요한 문서만 탐색")과 거리가 멀다.
- **환경:** `@simplysm/angular`는 Angular 21 기반 zoneless signal UI 라이브러리. 문서 주 독자는 (a) 소비 프로젝트의 Claude LLM, (b) simplysm 내부 개발자.
- **전제조건:**
  - 이전 WBS(`.tasks/260421202819_angular-docs-recipes-redesign/wbs.md`)의 **Feature 3.1(UI 컴포넌트 이관) → 3.2(Utils 이관) → 2.1(크로스 참조 정비)이 모두 완료된 상태**를 기준으로 한다. 즉 recipes의 MOVE 표식은 축약 링크로 대체되어 있고, docs에 역링크가 있으며, README 링크가 갱신된 상태이다.
  - 분해 대상: `crud-list.md`, `crud-detail.md`만. `page-modal-container.md`(187줄)와 `data-select-button.md`(318줄)는 이미 간결하고 "최소 뼈대 + 확장" 구조가 아니므로 제외.
  - 부록 A "풀 스택 합본 완성본"(crud-list 715줄, crud-detail 448줄): **제거**. wiki에서는 확장 매트릭스 표가 전체상을 보여주고, 각 확장 문서가 스니펫을 포함하므로 별도 합본 불필요. (사용자 결정 2026-04-22)
  - 이관 후보 목록 섹션: **제거**. 전 WBS 3.1→3.2→2.1 완료 후 전부 `[x]` 체크되어 추적 용도 종료.
  - 주의사항·관용규칙: **계층적 분산** — 공통 규칙(유틸 재도입 금지, public API 금지 등)은 진입점에 유지, 확장 특화 주의사항(cumulativeSelection, mark, setupCanDeactivate 등)은 해당 확장 파일에 인라인. (사용자 결정 2026-04-22)
- **기술적 제약:**
  - Markdown(CommonMark) 기반. 상대 경로 링크로 문서 간 연결.
  - 기존 외부 링크(docs/, README.md 등에서 recipes를 가리키는 링크)가 분해 후에도 유효해야 한다. 진입점 파일명은 `crud-list.md`/`crud-detail.md`를 유지하여 기존 링크 호환.
  - 확장 파일은 `recipes/crud-list/`, `recipes/crud-detail/` 서브디렉토리에 배치.
- **참조 자료:**
  - `packages/angular/docs/recipes/crud-list.md` — 분해 원본 (2,190줄). 섹션 구조: §1 Overview(8-23) / §2 언제 사용(24-38) / §3 최소 뼈대(39-315, 277줄) / §4 분해설명(316-356, 41줄) / §5 확장 A(357-732, 376줄) / §6 확장 B(733-821, 89줄) / §7 확장 C(822-871, 50줄) / §8 확장 D(872-986, 115줄) / §9 확장 E(987-1106, 120줄) / §10 확장 F(1107-1208, 102줄) / §11 확장 G(1209-1319, 111줄) / §12 뷰타입분기(1320-1334, 15줄) / §13 주의사항(1335-1360, 26줄) / §14 관용규칙(1361-1394, 34줄) / 부록 A(1395-2109, 715줄) / 부록 B(2110-2132, 23줄) / 이관 후보(2133-2190, 58줄)
  - `packages/angular/docs/recipes/crud-detail.md` — 분해 원본 (1,741줄). 섹션 구조: §1 Overview(8-24) / §2 언제 사용(25-39) / §3 최소 뼈대(40-260, 221줄) / §4 분해설명(261-296, 36줄) / §5 확장 A(297-492, 196줄) / §6 확장 B(493-587, 95줄) / §7 확장 C(588-781, 194줄) / §8 확장 D(782-844, 63줄) / §9 확장 E(845-918, 74줄) / §10 확장 F(919-1101, 183줄) / §11 뷰타입분기(1102-1131, 30줄) / §12 주의사항(1132-1179, 48줄) / §13 관용규칙(1180-1206, 27줄) / 부록 A(1207-1654, 448줄) / 부록 B(1655-1676, 22줄) / 이관 후보(1677-1735, 59줄) / Cross-ref(1736-1741, 6줄)
  - `packages/angular/docs/recipes/page-modal-container.md` (187줄) — 분해 대상 아님. 기존 링크 검증 대상
  - `packages/angular/docs/recipes/data-select-button.md` (318줄) — 분해 대상 아님. 기존 링크 검증 대상
  - `packages/angular/README.md` — recipes 링크 포함. 분해 후 링크 검증 대상
  - 이전 WBS: `.tasks/260421202819_angular-docs-recipes-redesign/wbs.md` — 선행 작업 맥락
  - `.claude/rules/sd-claude-rules.md` — 프로젝트 룰
  - `.claude/rules/sd-options.md` — 선택지 제시 규칙

## Impact Mapping

- **Goal:** `@simplysm/angular` recipes가 wiki 구조로 분해되어, 소비 앱 Claude/개발자가 **필요한 깊이의 문서만** 탐색하여 화면을 조립한다. 2,000줄짜리 단일 파일을 처음부터 끝까지 훑는 비용을 제거한다.
  - **Actor:** 소비 프로젝트의 Claude LLM (화면 조립 주체)
    - **Impact:** 조회 전용 페이지를 만들 때 진입점(최소 뼈대)만 읽고 바로 조립한다 (현재: 2,190줄 파일에서 최소 뼈대 277줄을 추출해야 함)
      - **Deliverable:** D1. crud-list 진입점 문서 (최소 뼈대 + 확장 네비게이션)
      - **Deliverable:** D2. crud-detail 진입점 문서 (최소 뼈대 + 확장 네비게이션)
    - **Impact:** inline 편집을 추가하고 싶을 때 해당 확장 문서만 열어 필요한 스니펫을 가져온다 (현재: 2,190줄 파일에서 해당 §을 찾아야 함)
      - **Deliverable:** D3. crud-list 각 확장(A~G) 독립 문서 7개
      - **Deliverable:** D4. crud-detail 각 확장(A~F) 독립 문서 6개
    - **Impact:** 전체상을 파악하고 싶을 때 진입점의 확장 매트릭스 표를 본다 (부록 A 합본 대체)
      - **Deliverable:** D5. 확장 매트릭스 표 (진입점 내 또는 별도 파일)
  - **Actor:** simplysm 내부 개발자·유지보수자
    - **Impact:** 특정 확장의 주의사항을 수정할 때 해당 확장 파일만 편집한다
      - **Deliverable:** D3, D4 (동일)
    - **Impact:** 크로스 참조·링크가 wiki 분해 후에도 정합하여 깨진 링크 없이 탐색한다
      - **Deliverable:** D6. 분해 후 크로스 참조 정합성 검증

## Feature Breakdown

### Epic 1. Recipes wiki 분해

#### [x] Feature 1.1 crud-list.md wiki 분해

**의존성:** 없음

**범위:**

- `crud-list.md`를 진입점 + 7개 확장 파일로 분해
- **진입점** (`recipes/crud-list.md` — 기존 파일명 유지, 기존 링크 호환):
  - §1 Overview 유지
  - §2 "언제 사용하는가" 비교표 유지
  - §3 최소 뼈대 코드(277줄) 유지 — 이것이 wiki의 "큰 그림" 진입점
  - §4 최소 뼈대 분해 설명(41줄) 유지
  - **확장 네비게이션 섹션 신규 작성** — 각 확장(A~G)의 한 줄 요약 + 독립 문서 링크. "뭘 더 하고 싶냐에 따라 선택" 안내
  - §12 뷰 타입 분기(15줄) 유지
  - 공통 주의사항(§13 중 전체 공통 항목) 유지 — "공통 유틸 재도입 금지", "테스트만을 위한 public API 금지" 등
  - 공통 관용 규칙(§14 중 최소 뼈대 관련) 유지 — sortingDefs.orderBy string overload 등
  - 부록 B 확장 매트릭스 표(23줄) 유지 (또는 확장 네비게이션에 통합)
  - Cross-reference 섹션 유지
- **확장 파일** (`recipes/crud-list/` 디렉토리):
  - `extension-a-inline-edit.md` — §5 확장 A(376줄) + 해당 주의사항·관용규칙 인라인 + 진입점 역링크
  - `extension-b-selection.md` — §6 확장 B(89줄) + 해당 주의사항 + 역링크
  - `extension-c-inline-delete.md` — §7 확장 C(50줄) + 역링크
  - `extension-d-select-modal.md` — §8 확장 D(115줄) + 해당 주의사항(cumulativeSelection, modal≠선택모달 등) + 역링크
  - `extension-e-readonly-modal.md` — §9 확장 E(120줄) + 해당 주의사항 + 역링크
  - `extension-f-modal-edit.md` — §10 확장 F(102줄) + 역링크
  - `extension-g-excel.md` — §11 확장 G(111줄) + 역링크
- **제거 대상:**
  - 부록 A 풀 스택 합본(1395-2109, 715줄) — 사용자 결정: 제거
  - 이관 후보 목록(2133-2190, 58줄) — 전 WBS 완료 후 용도 종료
- 각 확장 파일 상단에 **의존 확장 안내** — 예: 확장 B는 "확장 A 위에 누적"이므로 "선행: [확장 A](./extension-a-inline-edit.md)" 표시
- 기존 docs 파일들(ui-data/, ui-form/, utils/ 등)에서 crud-list.md를 가리키는 역링크의 앵커가 분해 후에도 유효하도록 처리 (앵커 유지 또는 리다이렉트 안내)

**경계:**

- crud-detail.md 분해는 Feature 1.2 범위
- page-modal-container.md, data-select-button.md 내용 변경 없음 (링크 검증만 Feature 1.3)
- docs/*.md 파일의 역링크 갱신은 본 Feature에서 앵커 호환만 보장하고, 경로 변경이 필요하면 Feature 1.3에서 처리

**근거:**

- Impact Mapping Deliverable: D1, D3, D5
- 사용자 요구 (2026-04-22): "최소 뼈대가 진입점이 되고 이것에 뭘 더 하고싶냐에 따라서 각 확장으로 들어갈수있는 식"
- 부록 A 제거, 이관 후보 제거, 주의사항 계층적 분산: 사용자 결정 (2026-04-22)
- 현행 파일: `packages/angular/docs/recipes/crud-list.md:1-2190`

---

#### [x] Feature 1.2 crud-detail.md wiki 분해

**의존성:** 1.1 (결정 파급: 1.1에서 진입점 구조, 확장 파일 포맷, 디렉토리 네이밍, 확장 네비게이션 표현, 역링크 형식이 정립되면 1.2가 답습)

**범위:**

- `crud-detail.md`를 진입점 + 6개 확장 파일로 분해
- **진입점** (`recipes/crud-detail.md` — 기존 파일명 유지):
  - §1 Overview 유지
  - §2 "언제 사용하는가" 비교표 유지
  - §3 최소 뼈대 코드(221줄) 유지
  - §4 최소 뼈대 분해 설명(36줄) 유지
  - **확장 네비게이션 섹션 신규 작성** (Feature 1.1과 동일 포맷)
  - §11 뷰 타입 분기(30줄) 유지
  - 공통 주의사항(§12 중 전체 공통 항목) 유지
  - 공통 관용 규칙(§13 중 최소 뼈대 관련) 유지
  - 부록 B 확장 매트릭스 표(22줄) 유지
  - Cross-reference 섹션 유지
- **확장 파일** (`recipes/crud-detail/` 디렉토리):
  - `extension-a-edit-save.md` — §5 확장 A(196줄) + 해당 주의사항·관용규칙 + 역링크
  - `extension-b-delete-restore.md` — §6 확장 B(95줄) + 역링크
  - `extension-c-modal-view.md` — §7 확장 C(194줄) + 해당 주의사항 + 역링크
  - `extension-d-control-view.md` — §8 확장 D(63줄) + 역링크
  - `extension-e-auxiliary.md` — §9 확장 E(74줄) + 역링크
  - `extension-f-complex-detail.md` — §10 확장 F(183줄) + 해당 주의사항·관용규칙 + 역링크
- **제거 대상:**
  - 부록 A 풀 스택 합본(1207-1654, 448줄)
  - 이관 후보 목록(1677-1735, 59줄)
- 각 확장 파일 상단에 의존 확장 안내 (Feature 1.1과 동일 패턴)
- 기존 docs 역링크 앵커 호환 보장

**경계:**

- crud-list.md 분해는 Feature 1.1 범위
- docs 역링크 경로 갱신이 필요하면 Feature 1.3에서 처리

**근거:**

- Impact Mapping Deliverable: D2, D4
- Feature 1.1 결과 (진입점 구조·확장 파일 포맷)를 답습
- 현행 파일: `packages/angular/docs/recipes/crud-detail.md:1-1741`

**설계 결정 (Feature 1.2 plan 단계):**

- D4: §5~§10 헤딩 유지 + 본문만 요약+링크 교체 → 기존 44건 역링크 앵커 자동 보존 (Feature 1.1과 동일)
- D5: §13 관용규칙 3 (setupCanDeactivate 뷰타입 분기) → extension-c-modal-view.md로 이동 (확장 C 특화). 규칙 1, 2는 진입점 유지
- §12 주의사항 6건은 전부 공통 → 진입점에 그대로 유지

---

#### [x] Feature 1.3 분해 후 크로스 참조 정합성 검증

**의존성:** 1.1, 1.2 (산출물 참조: 분해된 파일들의 링크를 검증)

**범위:**

- **recipes 내부 링크 검증:**
  - crud-list.md(진입점) ↔ crud-list/extension-*.md 간 링크
  - crud-detail.md(진입점) ↔ crud-detail/extension-*.md 간 링크
  - crud-list ↔ crud-detail 간 상호 참조 (기존 앵커 유효 여부)
  - page-modal-container.md, data-select-button.md에서 crud-list/crud-detail을 가리키는 링크 갱신
- **docs → recipes 역링크 검증:**
  - `docs/ui-data/sd-sheet.md`, `docs/ui-form/*.md`, `docs/ui-layout/*.md`, `docs/ui-overlay/sd-busy-container.md`, `docs/ui-navigation/*.md`의 역링크가 분해 후 유효한지
  - `docs/utils/*.md`, `docs/providers/*.md`, `docs/provider-types/*.md`의 역링크가 분해 후 유효한지
  - 앵커가 진입점에서 확장 파일로 이동한 경우 역링크 경로 갱신
- **README.md 링크 검증:**
  - `packages/angular/README.md`에서 recipes를 가리키는 링크가 유효한지
- 깨진 링크 발견 시 수정

**경계:**

- recipes 내용(코드 스니펫, 설명 텍스트) 수정 없음 — 링크만 검증·수정
- docs 파일의 본문 내용 수정 없음

**근거:**

- Impact Mapping Deliverable: D6
- 이전 WBS Feature 2.1과 유사한 "최종 링크 감사" 역할

## 제외 사항

- **`page-modal-container.md` 분해**: 187줄로 이미 간결. "최소 뼈대 + 확장" 구조가 아님. (사유: 이전 WBS에서도 제외, 구조 불일치)
- **`data-select-button.md` 분해**: 318줄로 이미 간결. "패턴 3종" 분기 구조는 "최소 → 확장 누적"과 다름. (사유: 이전 WBS에서도 제외, 구조 불일치)
- **부록 A 풀 스택 합본 → 별도 문서 유지**: wiki에서 불필요. (사유: 사용자 결정 2026-04-22 "제거")
- **docs/*.md 파일의 본문 확장/이관**: 이전 WBS(3.1→3.2→2.1) 범위. 본 WBS는 recipes 분해만. (사유: 선행 작업 완료 전제)

## 자가검증 (Self-Refine)

### Feature 크기

- **Feature 1.1** (crud-list 분해): 진입점 재작성 + 7개 확장 파일 생성 + 부록 A/이관 후보 제거 + 주의사항 분산. "crud-list.md 한 파일의 wiki 분해"라는 단일 책임으로 응집. 확장 파일 7개가 서로 의존(확장 B는 A 위에 누적 등)이라 분할 시 의존성 폭증. **분할하지 않음.**
- **Feature 1.2** (crud-detail 분해): 동일 사유로 분할하지 않음.
- **Feature 1.3** (링크 검증): 다파일 편집이지만 "링크 정합성"이라는 단일 책임. 적정.

### 의존성 매트릭스

| Feature | 의존 대상 |
|---------|----------|
| 1.1 | 없음 |
| 1.2 | 1.1 |
| 1.3 | 1.1, 1.2 |

- **순환 없음** ✓
- **의존성 없는 Feature 존재** ✓ (Feature 1.1)

### Feature-Deliverable 역추적

- 1.1 → D1, D3, D5 ✓
- 1.2 → D2, D4 ✓
- 1.3 → D6 ✓

모든 Feature가 Impact Mapping Deliverable에 역추적됨 ✓

### 독립성·단일 책임

- 각 Feature 이름과 실제 범위 일치 ✓
- 레이어 분할 없음 ✓

### 명명·범위 일관성

- Epic이 "Recipes wiki 분해"로 사용자 관점 기능 영역 기반 ✓

### 검증 가능성

- 각 Feature 범위가 구체적 파일 산출물(진입점, 확장 파일, 링크) 기준으로 기술됨 ✓
- 완료 판정: "해당 파일이 Feature 범위대로 생성/수정되었는지"로 판단

## 수행 순서

### 1단계

- **Feature 1.1**: crud-list.md wiki 분해

### 2단계 (← 1.1)

- **Feature 1.2**: crud-detail.md wiki 분해

### 3단계 (← 1.1, 1.2)

- **Feature 1.3**: 분해 후 크로스 참조 정합성 검증
