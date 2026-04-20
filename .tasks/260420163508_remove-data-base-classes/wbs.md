# WBS: @simplysm/angular 3종 Base·SdBaseContainer 제거 + `<sd-sheet>` cumulativeSelection 옵션 추가 + core 유틸 정리

## 프로젝트 개요

- **배경:** `@simplysm/angular`가 제공하는 `SdDataSheetBase`·`SdDataDetailBase`·`SdDataSelectButtonBase` 3종 상속 기반 추상화와 `SdBaseContainer` 레이아웃 추상화는 LLM 에이전트 코딩 세션에서 러닝 커브가 기하급수적으로 높다. 세션마다 기억이 초기화되는 Claude Code 입장에서는 (1) 기능이 부모 계층에 숨겨져 있어 이미 구현된 기능을 중복 작성하고, (2) `injectParent<Base>()` 역참조·`reflectComponentType(this.constructor)` 상속 트릭·10개 안팎의 abstract 멤버가 표준 Angular 관용구에서 벗어나 추론 오류를 누적시킨다. 이 추상화층을 완전히 제거하고, 소비 화면이 `<sd-sheet>`·`<sd-form>`·`<sd-busy-container>`·`<sd-topbar-container>` 같은 **표준 컴포넌트를 직접 조립**하도록 전환한다.
- **환경:**
  - 모노레포 pnpm, TypeScript ESM
  - 대상 패키지: `packages/angular` (Angular 21, zoneless, signal-based, standalone)
  - 현재 브랜치: `14.x`, 최근 커밋 `v14.0.47`
- **전제조건:**
  - 삭제 결정 확정 (점진적 deprecated 거부, 즉시 삭제 방향) — 사용자 결정(2026-04-20)
  - 삭제 범위 확정: β — 사용자 결정(2026-04-20) — `SdBaseContainer`까지 포함하는 "고유 추상화 0" 원칙
  - `data-select-button` 포함 확정: 사용자 결정(2026-04-20, 옵션 A) — 초기 사용자 제시 범위(`data-detail`/`data-sheet`/`layout/base-container`)에는 없었으나, 동일한 상속·`injectParent` 패턴이라는 이유로 일관 제거하기로 별도 합의
  - `<sd-sheet>` 본체 누적 선택 옵션 추가 확정: 사용자 결정(2026-04-20) — 기존 `setupCumulateSelectedKeys`가 실제로 누적 동작을 못 하는 미완성 상태이므로 본체에서 제대로 구현하기로 별도 Feature로 분리. 최종 설계는 `cumulativeSelection` boolean input 단일 추가(selectedItems 단일 model + `trackByFn` 재활용, 편의 API 미제공)
  - 모달 선택 계약 `selectedItemKeys` 유지 확정: 사용자 결정(2026-04-20, Epic 7 취소) — 최초 "selectedItems 단일로 통일" 방향(Epic 7)을 검토했으나, `<sd-shared-data-select*>`가 `SharedDataBase.__valueKey` 기반의 **key 중심 설계**를 가지고 있어 items 단일 계약으로 강제 통일 시 key↔items 변환 로직·`TModal` 제네릭 제약 재설계 등 본질적 복잡도가 발생. `<sd-sheet>`(items 중심)와 shared-data(key 중심)의 **이중 철학을 모달 경계에서 수용**해온 기존 `SelectModalOutputResult<T>` (`selectedItemKeys` + `selectedItems` 공존) 설계가 오히려 자연스럽다고 판단하여 Epic 7 전체 취소. sheet 기반 모달이 key를 제공하려면 소비 앱(모달 구현자)이 `selectedItems().map((it, i) => trackByFn()(it, i))`로 수동 변환(5.1 범위 269행 참조).
  - core 유틸 8종 심볼별 결정(2026-04-20):
    - **삭제 (4종)**: `TXT_CHANGE_IGNORE_CONFIRM`(앱별 커스터마이즈 위임), `withBusy`(앱별 busy 표현 자유도 우선), `setupCumulateSelectedKeys`(실제 누적 미동작 + `<sd-sheet>`로 이관), `injectParent`(Angular internal `_lView[8]` 트릭, 본 WBS 핵심 제거 대상)
    - **유지 (3종)**: `setupCanDeactivate`(모달/라우트 dual-mode 핵심), `injectCurrentPageCodeSignal`(`injectViewTitleSignal` 의존), `injectViewTitleSignal`(라우팅 헬퍼)
    - **수정 (1종)**: `injectViewTypeSignal` — `getComp: () => object` 인자 제거, `ElementRef.tagName` + `reflectComponentType(...).selector` 비교로 대체
  - 유지 대상: `SdModalContentDef<R>` · `SdSelectModal<T>` · `SelectModalOutputResult<T>` 인터페이스(기존 `selectedItemKeys` + `selectedItems` 이중 필드 그대로), `<sd-modal-select-button>`(기존 value 계약 key 기반 유지), `<sd-shared-data-select>` · `<sd-shared-data-select-list>`(기존 계약 유지), `getOrmDataEditToastErrorMessage`, `<sd-sheet>` · `<sd-busy-container>` · `<sd-topbar-container>` · `<sd-topbar>` 독립 컴포넌트, 위 core 유틸 "유지 (3종)" · "수정 (1종)" 목록
  - 신설 산출물 디렉토리: `packages/angular/docs/recipes/` (현재 미존재 확인 2026-04-20, `crud-list.md`·`crud-detail.md`·`data-select-button.md`·`page-modal-container.md`를 이 디렉토리에 작성). 파일 Write 시 디렉토리 자동 생성됨
- **기술적 제약:**
  - 브라우저 호환성: Chrome 61+ (기존 정책 유지)
  - `import type` 필수, `===`/`!==` 필수(null 비교만 `==`), `process.env` 금지(`env()` 사용), `Buffer` 금지 등 기존 코딩 규칙 유지
  - Feature별 완료 후 `pnpm check -t angular`가 통과해야 함
- **참조 자료:**
  - `packages/angular/src/index.ts` — 공개 API 표면 확인 (삭제 대상 export 라인 식별)
  - `packages/angular/CLAUDE.md` — 패키지 아키텍처·명명 규칙 재확인 (레시피 작성 시 참고)
  - `packages/angular/src/data/data-sheet/sd-data-sheet.base.ts` (253줄) — 삭제 전 Manager 5종 호출 관계와 기능 목록 파악 (레시피에 기능 재현 시 누락 방지)
  - `packages/angular/src/data/data-detail/sd-data-detail.base.ts` (158줄) — 변경 감지·canDeactivate·toast·snapshot 로직을 레시피에서 재현 가능하게 풀어쓰기 위한 참조
  - `packages/angular/src/layout/base-container/sd-base-container.ts` (121줄) — page/modal/control 뷰 분기 로직을 레시피에서 화면 내부로 인라인 조립할 때의 참조 원본
  - `packages/angular/src/data/shared-data/sd-shared-data-select-button.ts:16` — `SdDataSelectButtonBase` 상속 지점(간접 영향, 재구현 필요)
  - `.claude/references/sd-frontend-design.md`, `.claude/references/sd-testing.md` — 레시피 문서 작성 스타일 정합성 확인

## Impact Mapping

- **Goal:** LLM 에이전트 세션에서 `@simplysm/angular` 고유 상속 추상화에 의한 재학습 비용을 제거하여, 신규 화면 개발 시 "이미 있는 기능을 없는 줄 알고 중복 구현" 문제와 "abstract 멤버 혼동·injectParent 역참조 미이해" 문제를 해소한다.
  - **Actor:** `@simplysm/angular` 소비 앱 개발자 (Claude Code 에이전트 포함)
    - **Impact:** 신규 CRUD 리스트·상세·선택버튼·페이지/모달 화면을 표준 Angular 관용구(컴포넌트 + signal input/output + `@if`/`@for`)로만 작성하고, 부모 Base 파일을 동반 열람하지 않는다.
      - **Deliverable D1:** `SdDataSheetBase`/`SdDataSheet`/`SdDataSheetColumn`/Manager 5종/타입 3종 제거
      - **Deliverable D2:** `SdDataDetailBase`/`SdDataDetail`/`SdDataDetailDataInfo` 제거
      - **Deliverable D3:** `SdDataSelectButtonBase`/`SdDataSelectButton` 제거
      - **Deliverable D4:** `SdBaseContainer` 제거
    - **Impact:** Base 없이 화면을 조립할 때 참고할 표준 레시피(코드 스니펫) 문서를 보고 복사·수정만으로 신규 화면을 완성한다.
      - **Deliverable D5:** `packages/angular/docs/recipes/crud-list.md`, `crud-detail.md`, `data-select-button.md`, `page-modal-container.md` 신설
  - **Actor:** `@simplysm/angular` 메인테이너
    - **Impact:** 유지보수 대상 공개 API 표면이 축소되어 버그 표면적이 감소한다.
      - **Deliverable D6:** `packages/angular/src/index.ts`의 삭제 대상 export 제거 (238–245, 248–252, 258–259, 203줄 영역)
      - **Deliverable D7:** `packages/angular/docs/features-data-sheet.md`·`features-data-detail.md`·`features-data-select-button.md` 삭제, `ui-data.md`·`README.md`의 관련 섹션 정리
  - **Actor:** 내부 tests·shared-data 소비 코드 (모노레포 내부)
    - **Impact:** Base 상속에 의존하던 fixture/spec이 표준 컴포넌트 조립 기반으로 재작성되어 삭제 후에도 테스트가 통과한다.
      - **Deliverable D8:** `packages/angular/tests/data/data-sheet/*`, `tests/data/data-detail/*`, `tests/data/data-select-button/*`, `tests/layout/base-container/*`, `tests/data/shared-data/shared-data-select-button.spec.ts` 재작성 또는 삭제
      - **Deliverable D9:** `packages/angular/src/data/shared-data/sd-shared-data-select-button.ts`를 `SdDataSelectButtonBase` 비의존으로 재구현
  - **Actor:** `<sd-sheet>` 본체 및 그 소비 앱
    - **Impact:** 다중 페이지에 걸친 선택 누적이 프레임워크 차원에서 실제로 작동하게 된다(현재는 `setupCumulateSelectedKeys`가 이름과 달리 overwrite만 수행하여 미작동).
      - **Deliverable D10:** `packages/angular/src/data/sheet/sd-sheet.ts`에 `cumulativeSelection = input(false, { transform: booleanAttribute })` boolean input 추가 (기존 `selectedItems` model·`trackByFn` input 재활용, 신규 key/keys 관련 input/output 도입 없음). `cumulativeSelection()` true일 때 items 변경 시 `selectedItems` 유지로 전 페이지 누적 실현. `useSelectionManager` 내부 비교 로직을 `trackByFn`+`obj.equal` 기반으로 전환(호출처 전수조사 선행). `tests/sheet/*` 회귀 및 신규 케이스 추가
  - **Actor:** `@simplysm/angular` 메인테이너 (core 유틸 정리)
    - **Impact:** Base 삭제로 고아화된 core 유틸이 정리되어 공개 API 표면이 더욱 축소되고 Angular internal 트릭 의존이 제거된다.
      - **Deliverable D11:** `src/core/commons.ts`(TXT_CHANGE_IGNORE_CONFIRM)·`src/core/withBusy.ts`·`src/core/selection/setupCumulateSelectedKeys.ts`·`src/core/injectParent.ts` 삭제 + `src/core/routing/injectViewTypeSignal.ts` 시그니처 수정(getComp 제거) + `index.ts` 해당 export 제거

## Feature Breakdown

### Epic 1. 데이터 리스트 CRUD 추상화 제거

#### [x] Feature 1.1 SdDataSheet 추상화 전면 제거 및 리스트 화면 조립 레시피 확립

**의존성:** 4.1, 5.1

**범위:** (세부 계획: [1.1-sd-data-sheet-removal.md](./1.1-sd-data-sheet-removal.md), 2026-04-20 plan 확정)

- `packages/angular/src/data/data-sheet/sd-data-sheet.base.ts` 삭제 (253줄, `SdDataSheetBase` 추상 클래스)
- `packages/angular/src/data/data-sheet/sd-data-sheet.ts` 삭제 (`SdDataSheet` 컴포넌트, `injectParent<SdDataSheetBase<any>>()` 역참조 포함)
- `packages/angular/src/data/data-sheet/sd-data-sheet-column.ts` 삭제 (`SdDataSheetColumn` 디렉티브, 상속 컨텐츠 자식)
- `packages/angular/src/data/data-sheet/sd-data-sheet.types.ts` 삭제 (`SdDataSheetItemPropInfo`, `SdDataSheetItemInfo`, `SdDataSheetSearchResult` 타입 3종)
- `packages/angular/src/data/data-sheet/injectDataSheetExcelManager.ts` 삭제
- `packages/angular/src/data/data-sheet/injectDataSheetInlineEditManager.ts` 삭제
- `packages/angular/src/data/data-sheet/injectDataSheetModalEditManager.ts` 삭제
- `packages/angular/src/data/data-sheet/injectDataSheetRefreshManager.ts` 삭제
- `packages/angular/src/data/data-sheet/useDataSheetFilterManager.ts` 삭제
- `packages/angular/src/data/data-sheet/setupCloserWhenSingleSelectionChange.ts` 삭제
- `packages/angular/src/index.ts`에서 관련 export 제거: `SdDataSheet` (237줄), `SdDataSheetBase`·`SdDataSheetItemPropInfo`·`SdDataSheetItemInfo`·`SdDataSheetSearchResult` (238–243줄), `SdDataSheetColumn` (244줄), `setupCloserWhenSingleSelectionChange` (245줄)
- `packages/angular/tests/data/data-sheet/sd-data-sheet-test.fixture.ts` 내 `DSTestHost`(31줄)·`DSHeaderStyleTest`(75줄)·`DSTooltipTest`(116줄)·`DSHeaderTplTest`(158줄) 4개 `extends SdDataSheetBase` 호스트를 표준 컴포넌트 조립 기반으로 재작성 또는 파일 삭제
- `packages/angular/tests/data/data-sheet/data-sheet.spec.ts` (625줄) 재작성 또는 삭제 — 삭제되는 심볼만 테스트하는 케이스는 제거, `<sd-sheet>` 자체 동작을 검증하는 케이스는 `tests/sheet/`로 이관 또는 유지
- `packages/angular/tests/data/data-sheet/data-sheet-header-forwarding.acc.spec.ts` 재작성 또는 삭제 — 삭제 대상 `SdDataSheet` 컴포넌트의 header forwarding 동작 수락 테스트
- `packages/angular/tests/data/data-sheet/filter-manager.spec.ts` 삭제 — 삭제 대상 `useDataSheetFilterManager`에 대한 단위 테스트. Manager가 삭제되므로 테스트도 함께 제거
- `packages/angular/tests/data/data-sheet/*.verify.md` 정리 (`data-sheet-key-fallback.verify.md` 등 삭제 대상 기능을 다룬 것은 제거)
- `packages/angular/docs/features-data-sheet.md` 삭제
- `packages/angular/docs/recipes/crud-list.md` 신설 — `<sd-sheet>` + `<sd-form>` + 필터 signal + `useSortingManager`/`useSelectionManager` + `withBusy` + `setupCanDeactivate` + 페이지네이션 + 인라인/모달 편집 + 엑셀 업로드/다운로드 + 삭제·복구 토글을 화면 코드 안에서 직접 조립하는 완성 코드 스니펫. 삭제된 `SdDataSheetBase`가 제공하던 기능 목록(초기 refresh, canDeactivate, `ArrayOneWayDiffResult` 기반 diff 제출, `setupCumulateSelectedKeys`, `setupCloserWhenSingleSelectionChange`, ORM 에러 토스트, busy 카운트 관리, `summaryData` 계산)을 빠짐없이 재현 가능한 레퍼런스 코드
  - **레시피 작성 관용 규칙 1 (셀 내부 컨트롤 `inset`/`size`)**: 시트 셀(`<sd-sheet-column>`의 `[cell]` 템플릿) 내부에 삽입되는 컨트롤(`sd-textfield`/`sd-select`/`sd-checkbox`/`sd-numpad`/`sd-date-range-picker`/`sd-textarea` 등)은 `[inset]="true" [size]="'sm'"`를 명시한다. 예외: 복합 구조(텍스트+컨트롤)는 `[inset]="false"`, 큰 시트 행은 `[size]` 생략. 누락 시 컴파일 에러 없이 스타일만 깨지므로 레시피의 "자주 하는 실수" 섹션에 명시
  - **레시피 작성 관용 규칙 2 (`mark(sig)` 역할 정확한 서술)**: `mark(sig)`는 "저장 감지"가 아니라 **UI 동기화**용이다. `obj.equal`(`packages/core-common/src/utils/obj.ts:172`)이 deep equal로 값 차이를 감지하므로 signal mutation은 `mark` 없이도 `submit`에서 감지된다. mark의 실제 역할은 signal 참조 갱신 → OnPush 템플릿 재렌더링 + 다른 computed/effect 의존성 갱신. Chrome 61 호환성(Proxy 폴리필 불가)으로 자동 notify 불가하여 명시적 호출이 필요하다는 점을 설명. ❌ "mark 없으면 저장이 안 된다" 식 서술 금지
  - **레시피 작성 관용 규칙 3 (`sortingDefs` + `orderBy` 체인 경로)**: `Queryable.orderBy` string overload는 **완료**됨(`packages/orm-common/src/exec/queryable.ts:420`, 2026-04-20 plan 단계 확인). 레시피는 `qr.orderBy(s.key, s.desc ? "DESC" : "ASC")` 형태로 작성
- `packages/angular/docs/ui-data.md` 내 `SdDataSheet`/`SdDataSheetBase` 관련 섹션 제거 및 레시피 경로로 링크 교체
- `packages/angular/README.md` 내 API 표에서 `SdDataSheet`/`SdDataSheetBase`/`SdDataSheetColumn` 행 제거, 레시피 링크 추가
- Feature 완료 시 `pnpm check -t angular` 및 관련 vitest 통과 확인

**경계:**

- `<sd-sheet>` 자체 컴포넌트 (`packages/angular/src/data/sheet/sd-sheet.ts`)는 **이 Feature에서 건드리지 않음** — 삭제 대상 아님, 레시피에서 활용 대상
- `<sd-shared-data-select>`·`<sd-shared-data-select-list>` (상속 없음) 건드리지 않음 — Feature 3.1 범위와도 분리
- `getOrmDataEditToastErrorMessage` 함수는 유지 (`packages/angular/src/data/getOrmDataEditToastErrorMessage.ts`). index.ts:255 export도 유지. 다만 이 Feature에서 Manager 5종이 삭제되면서 호출처가 함께 없어지는데, 함수 자체는 공개 API로 남아 다른 소비앱에서 쓸 수 있음
- `useSelectionManager`·`useSortingManager`·`useExpandingManager`·`setupCanDeactivate` (core/selection, core/routing) **유지** — 레시피에서 직접 호출
- `withBusy`·`setupCumulateSelectedKeys`는 **본 WBS의 Feature 6.1에서 삭제 예정** — 레시피는 이 둘을 호출하지 말 것. busy는 소비 화면이 `busyCount = signal(0)` + `sdToast.try`로 직접 관리(사용자 결정 2026-04-20 D1, 중첩 작업 안전성), 선택 누적은 Feature 5.1의 `<sd-sheet [cumulativeSelection]="true" [trackByFn]="...">` 조합 사용
- 모달 뷰에서 `close.emit(SelectModalOutputResult<T>)` 호출은 **기존 계약**(`{ selectedItemKeys, selectedItems }` 이중 필드) 그대로 작성. sheet 기반 모달의 경우 sheet 자체는 key를 직접 노출하지 않으므로 `selectedItemKeys`는 `selectedItems().map((it, i) => trackByFn()(it, i))` 수동 변환으로 구성(Feature 5.1 D10·범위 269행 참조)
- `injectViewTypeSignal`은 **Feature 6.1에서 `getComp` 인자 제거 수정 예정** — 레시피는 신 시그니처 `injectViewTypeSignal()` 기준으로 작성
- `injectParent`는 **Feature 6.1에서 삭제 예정** — 레시피·소비 화면이 이를 호출하지 말 것
- 외부 소비 앱(모노레포 밖) 마이그레이션 가이드는 이 Feature 범위 아님 (아래 "제외 사항" 참조)

**근거:**

- Impact Mapping Deliverable: D1(리스트 추상화 제거) + D5(레시피) + D6(index.ts) + D7(docs) + D8(tests)
- 조사 결과 (subagent 영향 범위 조사 보고, 2026-04-20):
  - 삭제 대상 파일 10개는 `packages/angular/src/data/data-sheet/` 디렉터리 내부로 완결 (외부 참조 0)
  - index.ts export 10개 행 식별 (237, 238–243, 244, 245)
  - tests 영향: fixture 1개 파일(`sd-data-sheet-test.fixture.ts`, 4개 테스트 호스트 클래스 포함) + spec 3개(`data-sheet.spec.ts` 625줄, `data-sheet-header-forwarding.acc.spec.ts`, `filter-manager.spec.ts`) + verify 1건(`data-sheet-key-fallback.verify.md`)
  - SCSS 의존성 0, packages/* 외부 참조 0
- 사용자 의사결정(대화 2026-04-20): "삭제면 삭제인거지" → 점진적 deprecated 거부, 즉시 삭제 확정. "β: SdBaseContainer까지 제거" 선택 → 컨테이너까지 제거하는 "고유 추상화 0" 원칙 채택
- LLM 러닝 커브 근거: `sd-data-sheet.base.ts:88`의 `reflectComponentType(this.constructor as any)` 상속 트릭, 10개의 abstract/optional 멤버(canUse/canEdit/editMode/selectMode/bindFilter/itemPropInfo/getItemInfoFn/search/newItem/submit/editItem/toggleDeleteItems/downloadExcel/uploadExcel/prepareRefreshEffect), `sd-data-sheet.ts:192`의 `injectParent<SdDataSheetBase<any>>()` 역참조

---

### Epic 2. 데이터 상세폼 CRUD 추상화 제거

#### [x] Feature 2.1 SdDataDetail 추상화 전면 제거 및 상세폼 화면 조립 레시피 확립

**의존성:** 1.1, 4.1

**범위:** (세부 계획: [2.1-sd-data-detail-removal.md](./2.1-sd-data-detail-removal.md), 2026-04-20 plan 확정 — 부수 문서 `CLAUDE.md`·`features.md`·`naming-convention.verify.md`의 SdDataDetail 언급 정리까지 Feature 2.1 범위로 확장(D4))

- `packages/angular/src/data/data-detail/sd-data-detail.base.ts` 삭제 (158줄, `SdDataDetailBase` 추상 클래스 + `SdDataDetailDataInfo` 인터페이스)
- `packages/angular/src/data/data-detail/sd-data-detail.ts` 삭제 (`SdDataDetail` 컴포넌트, `injectParent<SdDataDetailBase<any>>()` 역참조 포함)
- `packages/angular/src/index.ts`에서 관련 export 제거: `SdDataDetail` (248줄), `SdDataDetailBase`·`SdDataDetailDataInfo` (249–252줄)
- `packages/angular/tests/data/data-detail/sd-data-detail-test.fixture.ts` 내 `DDTestHost extends SdDataDetailBase` (26줄) 재작성 또는 파일 삭제
- `packages/angular/tests/data/data-detail/data-detail.spec.ts` (557줄) 재작성 또는 삭제
- `packages/angular/tests/data/data-detail/sd-data-detail-microtask.verify.md` 정리
- `packages/angular/docs/features-data-detail.md` 삭제
- `packages/angular/docs/recipes/crud-detail.md` 신설 — `<sd-form>` + load/save/delete 라이프사이클 + `obj.equal` snapshot 기반 변경 감지 + `setupCanDeactivate`를 이용한 이탈 방지 + busy 카운트 + `SdToastProvider.try`를 이용한 ORM 에러 메시지 변환 + Ctrl+S/Ctrl+Alt+L 단축키 처리(`SdCommandDirective`)를 화면 파일에 직접 조립하는 완성 코드 스니펫. 페이지 뷰와 모달 뷰 모두 커버
  - **레시피 작성 관용 규칙 (`mark(data)` 역할 정확한 서술)**: `mark(data)`는 "저장 감지"가 아니라 **UI 동기화**용이다. `obj.equal`(`packages/core-common/src/utils/obj.ts:172`)이 deep equal로 snapshot과 값 차이를 감지하므로 `data().field = value` mutation은 `mark` 없이도 `submit`에서 감지된다. mark의 실제 역할은 signal 참조 갱신 → OnPush 템플릿 재렌더링 + 다른 computed/effect 의존성 갱신. Chrome 61 호환성(Proxy 폴리필 불가)으로 자동 notify 불가하여 명시적 호출이 필요하다는 점을 설명. ❌ "mark 없으면 저장이 안 된다" 식 서술 금지
- `packages/angular/docs/ui-data.md` 내 `SdDataDetail`/`SdDataDetailBase` 섹션 제거 (plan 단계 확인: `ui-data.md`에 해당 심볼 언급 없음 — Grep 결과 2026-04-20. 실제 정리 대상 파일은 아래 확장 문서들)
- `packages/angular/README.md` API 표에서 해당 행 제거 (`:163-164` SdDataDetailBase/SdDataDetail, `:179` SdDataDetailDataInfo, `:343`·`:362` 상속 설명)
- **부수 문서 정리 확장(Feature 2.1 범위 — D4, AskUserQuestion 2026-04-20):**
  - `packages/angular/CLAUDE.md:58, 93, 199-200` SdDataDetail 언급 제거 (SdDataSelectButton 관련은 Feature 3.1까지 유지)
  - `packages/angular/docs/features.md:50-78` "Data View Abstractions" 섹션 내 SdDataDetail 행·Cross-ref·`SdDataDetailDataInfo` 공통 타입 블록만 제거 (SdDataSelectButton 행·섹션 제목은 유지 — Feature 3.1에서 최종 정리)
  - `packages/angular/tests/naming-convention.verify.md:21` SdDataDetailBase 체크리스트 항목 삭제
- Feature 완료 시 `pnpm check -t angular` 통과 확인

**경계:**

- `<sd-form>` (`packages/angular/src/controls/form/sd-form.ts`)는 유지 — 레시피에서 활용
- `SdModalContentDef<R>` 인터페이스는 유지 — 화면을 모달로 띄울 때 여전히 필요. 현재 `sd-data-detail.base.ts:30`에서 `implements SdModalContentDef<R>` 했으나, Base 삭제 후에는 소비 화면이 직접 `implements SdModalContentDef<R>`
- `setupCanDeactivate` (`core/routing/setupCanDeactivate`), `SdToastProvider`, `obj` from `@simplysm/core-common` — 유지
- `withBusy`는 Feature 6.1에서 삭제 예정 — 레시피는 `busy = signal(false)` + `try { busy.set(true); ... } finally { busy.set(false); }` 패턴 또는 count signal + 동일 sdToast.try로 직접 구성
- `SdCommandDirective` (`sdSaveCommand`, `sdRefreshCommand`, `sdInsertCommand`) — 유지. `sd-data-detail.ts:45~51`에서 hostDirective로 쓰였으나 레시피에서는 소비 화면이 직접 붙임

**근거:**

- Impact Mapping Deliverable: D2 + D5 + D6 + D7 + D8
- 조사 결과: 삭제 대상 2개 파일, 간접 참조 0, tests fixture 1개 + spec 557줄
- `sd-data-detail.base.ts:99` `setupCanDeactivate` 호출, `:69~97` 초기화 effect + `queueMicrotask` 패턴, `:122~129` snapshot clone, `:152~185` `doSubmit`의 no-change 감지 → 레시피에 명시적으로 풀어쓰기

---

### Epic 3. 모달 선택 버튼 추상화 제거

#### [x] Feature 3.1 SdDataSelectButton 추상화 제거 및 SdSharedDataSelectButton 재구현

**의존성:** 1.1, 4.1, 5.1

**범위:** (세부 계획: [3.1-sd-data-select-button-removal.md](./3.1-sd-data-select-button-removal.md), 2026-04-20 plan 확정)

- `packages/angular/src/data/data-select-button/sd-data-select-button.base.ts` 삭제 (`SdDataSelectButtonBase` 추상 클래스)
- `packages/angular/src/data/data-select-button/sd-data-select-button.ts` 삭제 (`SdDataSelectButton` 컴포넌트)
- `packages/angular/src/data/shared-data/sd-shared-data-select-button.ts` **재구현** — 현재 `:16`에서 `extends SdDataSelectButtonBase<TItem, string | number, TMode>`로 상속하고 있음. 이를 `SdModalSelectButton` 기반 독립 컴포넌트로 재작성. `SdSharedDataProvider` 연동·키 기반 로딩·표시 텍스트 렌더링 등을 상속 없이 직접 구현
- `packages/angular/src/index.ts`에서 export 제거: `SdDataSelectButton` (258줄), `SdDataSelectButtonBase` (259줄)
- `packages/angular/tests/data/data-select-button/sd-data-select-button-test.fixture.ts` 내 `DSBTestHost extends SdDataSelectButtonBase` (25줄) 재작성 또는 삭제
- `packages/angular/tests/data/data-select-button/data-select-button.spec.ts` (460줄) 재작성 또는 삭제
- `packages/angular/tests/data/shared-data/sd-shared-data-select-button-test.fixture.ts` — `SdSharedDataSelectButton` 재구현에 맞춰 재작성 (기존 `SdDataSelectButtonBase` 상속 전제의 fixture에서 독립 컴포넌트 기반 fixture로 전환)
- `packages/angular/tests/data/shared-data/shared-data-select-button.spec.ts` — 위 fixture 변경에 맞춰 재작성 (기존 extends 기반 검증 제거, 재구현된 표준 컴포넌트 검증으로 전환)
- `packages/angular/docs/features-data-select-button.md` 삭제
- `packages/angular/docs/recipes/data-select-button.md` 신설 — `SdModalSelectButton` 직접 사용 + 선택 모달은 Feature 1.1 레시피 기반으로 작성된 CRUD 리스트 화면을 모달로 재활용하는 패턴
- `packages/angular/docs/ui-data.md`·`README.md` 관련 섹션 정리
- Feature 완료 시 `pnpm check -t angular` 통과 확인

**경계:**

- `SdModalSelectButton` (`packages/angular/src/controls/button/sd-modal-select-button.ts`) — 기존 계약(key 기반 `value` + `selectedItems` 보조 model) 그대로 사용. 이 컴포넌트가 선택 모달의 표준 기반
- `SdSelectModal<T>` · `SelectModalOutputResult<T>` 인터페이스 — 기존 계약(`selectedItemKeys` + `selectedItems` 이중 필드) 유지. 재구현된 `SdSharedDataSelectButton`은 `SdModalSelectButton`을 내부에 두고 `modal` input을 그대로 전달
- `SdSharedDataProvider` (`core/shared-data/sd-shared-data.provider.ts`) 유지 — 재구현 시 그대로 사용
- `<sd-shared-data-select>`·`<sd-shared-data-select-list>` (같은 폴더의 자매 컴포넌트) — 상속 의존 없음, 이 Feature에서 건드리지 않음
- 다음 `packages/angular/tests/data/shared-data/` 파일들은 위 자매 컴포넌트 대상이라 **이 Feature 범위가 아님**: `sd-shared-data-select-test.fixture.ts`, `shared-data-select.spec.ts`, `sd-shared-data-select-list-test.fixture.ts`, `shared-data-select-list.spec.ts`, `shared-data-select-memoize.verify.md`, `shared-data-select-undefined-style.spec.md`, `shared-data-select-undefined-style.verify.md`

**근거:**

- Impact Mapping Deliverable: D3 + D5 + D6 + D7 + D8 + D9(상속 해소, 기존 계약 유지)
- 조사 결과: `sd-shared-data-select-button.ts:16`이 `SdDataSelectButtonBase` 상속 → Base 삭제만으로는 컴파일 깨짐. **재구현이 이 Feature의 end-to-end 완결 조건**
- tests: fixture 1개 + data-select-button.spec 460줄 + shared-data-select-button.spec 일부

---

### Epic 4. 레이아웃 Base 컨테이너 제거

#### [x] Feature 4.1 SdBaseContainer 제거 및 페이지/모달 조립 레시피 확립

**의존성:** 없음

**범위:** (세부 계획: [4.1-sd-base-container-removal.md](./4.1-sd-base-container-removal.md), 2026-04-20 plan 확정)

- `packages/angular/tests/layout/base-container/sd-base-container-test.fixture.ts` 삭제 — `SdBaseContainer` 전용 테스트 호스트
- `packages/angular/tests/layout/base-container/base-container.spec.ts` (216줄) 삭제 — 대체 테스트 작성하지 않음 (레시피는 문서이므로 테스트 대상 아님, plan D4)
- `packages/angular/docs/recipes/page-modal-container.md` 신설 — `injectViewTypeSignal()` (신 시그니처 기준) + `<sd-busy-container>` + `@if (currViewType() === "page") { <sd-topbar-container>...<sd-topbar>...</sd-topbar>... }` `@else if (currViewType() === "modal") { ... }` `@else { <ng-content /> }` 분기를 소비 화면 내에서 직접 조립하는 스니펫. 모달 하단 액션 슬롯, 페이지 topbar 슬롯, 권한 없음(restricted) 메시지, 초기화 전 숨김(initialized), busy 오버레이, `modalOrPageTitle` 인라인 computed 까지 포함
- `packages/angular/docs/features.md:3-38` 의 `## \`SdBaseContainer\`` 섹션 제거 (WBS 초안의 "ui-layout.md 섹션" 기재는 오기 — plan D3, Grep 결과 2026-04-20 `ui-layout.md`에 해당 섹션 부재. 실제 섹션은 `features.md`에 위치)
- `packages/angular/README.md:160` 의 `| \`SdBaseContainer\` | component | ... |` 행 제거
- **내부 소비 화면 확인**: Feature 1.1/2.1/3.1의 레시피 작성 시 `<sd-base-container>` 대신 본 Feature의 분기 코드(`page-modal-container.md`)를 그대로 사용하여 통일. 본 Feature가 **1.1/2.1/3.1의 선행 조건** (분기 패턴이 확정되어야 다른 레시피의 페이지/모달 조립부가 결정됨)
- Feature 완료 시 `pnpm check -t angular` 통과 확인

**본 Feature에서 제외 → Feature 6.1로 이관:** (사용자 결정 2026-04-20 "선택지 A", plan D1)

- `packages/angular/src/layout/base-container/sd-base-container.ts` 파일 삭제 (121줄)
- `packages/angular/src/index.ts:202-203` `// layout/base-container` 주석 및 `export { SdBaseContainer }` 제거
- 사유: 참조자 `src/data/data-sheet/sd-data-sheet.ts:20,52,65,385` 및 `src/data/data-detail/sd-data-detail.ts:16,37,53,188` 가 Feature 1.1·2.1 수행 전까지 살아있어 4.1 시점에 파일을 삭제하면 `pnpm check -t angular` 가 참조 에러로 실패함. 1.1·2.1 완료 후 참조자가 0이 되는 6.1 시점에 안전하게 삭제

**경계:**

- `SdBusyContainer` (`core/busy/sd-busy-container.ts`), `SdTopbarContainer`·`SdTopbar` (`layout/topbar/*`) — 모두 **유지**. 사용자 화면이 이들을 직접 조립하게 됨
- `injectCurrentPageCodeSignal`·`injectFullPageCodeSignal`·`injectViewTitleSignal`·`SdAppStructureProvider`·`SdActivatedModalProvider`·`SdSystemLogProvider` — 유지. 레시피에서 화면이 직접 inject
- `injectViewTypeSignal`은 Feature 6.1에서 `getComp` 인자 제거 수정 예정 — 레시피는 **신 시그니처 `injectViewTypeSignal()`** 기준으로 작성 (호출부에 `() => this` 쓰지 말 것)
- `injectParent`는 Feature 6.1에서 삭제 예정 — 레시피·소비 화면에서 호출 금지
- `modalOrPageTitle` 계산 로직(`sd-base-container.ts:102~113`의 `header ?? modal title ?? appStructure title`) — 레시피에 풀어쓰기. 새로운 유틸 함수는 만들지 않음(추상화 재도입 방지)

**근거:**

- Impact Mapping Deliverable: D4 + D5 + D6 + D7 + D8
- 조사 결과: 삭제 파일 1개, 내부 참조 없음, spec 216줄
- 사용자 결정: β 선택 (2026-04-20) — "고유 추상화 0" 원칙 채택하여 `SdBaseContainer`까지 제거

---

### Epic 5. `<sd-sheet>` 본체 누적 선택 옵션 추가

#### [x] Feature 5.1 `<sd-sheet>`에 cumulativeSelection 옵션 추가

**의존성:** 없음 (단 Feature 1.1·3.1의 레시피가 본 Feature의 결과 API를 참조하므로 1.1·3.1의 선행 조건. 매트릭스 참조)

**범위:**

- `packages/angular/src/data/sheet/sd-sheet.ts`에 다음 추가:
  - `cumulativeSelection = input(false, { transform: booleanAttribute })` — 신규 boolean input. **기본값 false**로 기존 소비자 영향 없음. `true`일 때 items 변경(페이지 이동·필터·검색) 시에도 `selectedItems`의 기존 객체 reference를 **제거하지 않고 유지**하여 전 페이지에 걸친 선택 누적 실현
  - 기존 `selectedItems = model<T[]>([])` (`sd-sheet.ts:587`)는 **단일 저장소로 유지**. 신규 `selectedItemKeys` / `keySelectorFn` / `allSelectedItemKeys` 등의 추가 input/output은 **도입하지 않음** (사용자 결정 2026-04-20: "편의 API는 output 아니면 ViewChild 강제라 의미 없음")
  - key 추출은 **기존 `trackByFn` input 재활용** (`sd-sheet.ts:566`)
- 내부 로직:
  - `cumulativeSelection()` false (기본): items 변경 시 `<sd-sheet>` 내부 effect가 `selectedItems.set([])`로 **완전 초기화**. 검색/필터/페이지 이동 등 items 교체 시 선택이 전부 해제된다 (사용자 결정 2026-04-20, 옵션 C 채택 — plan 단계 AskUserQuestion으로 확정)
  - `cumulativeSelection()` true: items 변경 시 `selectedItems`는 **건드리지 않음**. 이전 페이지에서 체크된 item 객체가 그대로 `selectedItems()`에 누적. 체크 표시 판정(isSelected)은 `trackByFn` 기반 key 비교 + `obj.equal`(`packages/core-common/src/utils/obj.ts:172`) deep equal로 전환되어야 서버 페이지네이션에서 새 객체 reference에도 체크 표시 복원 가능
  - 명시적 리셋(누적 모드에서도)은 외부 소비자가 `selectedItems.set([])` 호출
- `useSelectionManager` (`packages/angular/src/core/selection/useSelectionManager.ts`) 수정:
  - 현재 `selectedItemsSet = new Set(options.selectedItems())` 기반 reference equality (`useSelectionManager.ts:29, 92`)
  - **`trackByFn` + `obj.equal` 기반 비교로 전환 필요** — 누적 모드에서 selectedItems에 다른 페이지 item 객체가 섞여 있을 때 정확한 isSelected 판정의 전제
  - 외부 호출처 영향 조사 필수 — `<sd-shared-data-select-list>`, `<sd-shared-data-select>` 등 모노레포 내부 소비자 + 외부 소비 앱까지 plan 단계에서 전수조사하여 의미 변경(reference → key/deep) 영향 확인
- `packages/angular/tests/sheet/` 신규 spec:
  - `cumulativeSelection=true` + 다중 페이지 체크 누적 유지 검증
  - `cumulativeSelection=true` + 검색·필터 변경 시 `selectedItems` 유지 검증
  - `cumulativeSelection=true` + 같은 key, 다른 reference item 재로드 시 isSelected 복원 검증 (`obj.equal` 기반)
  - `cumulativeSelection=false` 기본 동작 회귀 없음 검증
- `packages/angular/docs/ui-data.md`의 `<sd-sheet>` 섹션에 `cumulativeSelection` input 문서화
  - **docstring 주의사항 박제**: 누적 모드 사용 시 `trackByFn` 명시 필수(기본 `(item) => item`은 reference 기반이라 서버 페이지네이션에서 비교 실패)
  - **소비자가 key 배열이 필요한 경우**(예: `SelectModalOutputResult<T>.selectedItemKeys` 구성) `selectedItems().map((it, i) => trackByFn()(it, i))` 수동 호출 패턴 명시
  - **사용 패턴 가이드**:
    - 원칙: 선택 모달(viewType=modal) + 다중 선택(selectMode=multi) 조합에서는 여러 페이지 돌며 누적 필요 → `true`. 그 외(page 뷰 또는 single selectMode)는 현재 뷰 일괄 작업이 일반적 → `false` (기본값)
    - 권장: 정적 `true`/`false`가 아니라 **동적 computed 바인딩**으로 상황에 맞게
      ```html
      <sd-sheet
        [cumulativeSelection]="viewType() === 'modal' && selectMode() === 'multi'"
        ...
      >
      ```
    - docstring에 이 조건식 예시 그대로 수록
- Feature 완료 시 `pnpm check -t angular` + `vitest run tests/sheet/` 통과 확인

**경계:**

- 기존 `selectedItems` API(`sd-sheet.ts:587`)·`trackByFn`(`sd-sheet.ts:566`) 시그니처 변경 금지
- `SdDataSheetBase`·`<sd-data-sheet>` 자체는 이 Feature에서 건드리지 않음 (Feature 1.1 범위)
- `setupCumulateSelectedKeys` 삭제는 Feature 6.1에서 수행 (본 Feature는 `<sd-sheet>` 확장에만 집중)
- `selectedItemKeys` / `allSelectedItemKeys` / `keySelectorFn` 등의 추가 API 도입 금지
- 편의 computed·getter 메서드 제공 안 함 (사용자 결정: two-way 아니면 실용성 없음)

**근거:**

- Impact Mapping Deliverable: D10
- 현재 `setupCumulateSelectedKeys` (`src/core/selection/setupCumulateSelectedKeys.ts:10-28`)가 items 변경 시 items에 없는 selectedItems를 **제거**하여 누적이 아닌 필터링만 수행 — Read 결과 확인 (2026-04-20)
- 사용자 결정 이력 (대화 2026-04-20):
  - 1차 설계 제안: `selectedItems` 유지 + `selectedItemKeys`/`keySelectorFn`/`cumulateSelection` 3개 API 추가 → 이름/개수 재논의
  - 2차 (양 model 방향): `cumulatedSelectedItemKeys`(후 `allSelectedItemKeys`) + `trackByFn` 재활용 → 두 model 간 동기화에서 **순환 문제** 제기 ("selectedItems를 사용자가 수정했을때, allSelectedItemKeys를 사용자가 수정했을때, 와 sheet컨트롤 내부적으로 수정됬을때를 구분하지 못하니 sync를 어떻게 맞출지가 문제")
  - 3차 (최종, 옵션 E): "selectedItems만 놓고 옵션으로 cumulate 여부설정하는 boolean을 input으로 받는건 어때? 어차피 동시에 쓸일은 없을거같은데" → 단일 model + boolean toggle로 순환 원천 차단
  - 이름 확정: `cumulativeSelection` (sd-options 옵션 B, 2026-04-20) — "selected에 대한 누적" 뉘앙스 명시, 형용사+명사 형태
  - 편의 API 제공 안 함 확정 (sd-options 옵션 α, 2026-04-20) — 사용자 의견 "output으로 제공해주는거 아니면 굳이 computed해봐야 바깥에서 쓰려면 viewChild써야해서 의미없음"
  - `cumulativeSelection=false` 모드의 items 변경 시 동작 확정 (sd-plan 단계 AskUserQuestion, 2026-04-20, **옵션 C**): `selectedItems.set([])`로 **완전 초기화**. 후보였던 옵션 A(자동 정리 없음)·옵션 B(filter만)는 거부. Feature 문서 `5.1-sd-sheet-cumulative-selection.md` D1 참조
- 기존 `<sd-sheet>` 기반 인프라: `trackByFn` input 존재 (`sd-sheet.ts:566`, `:226`에서 `@for track`으로 이미 활용). `selectedItems` model 존재 (`sd-sheet.ts:587`). `useSelectionManager` 내부 reference equality (`useSelectionManager.ts:29, 92`) → key/`obj.equal` 기반으로 전환 대상

---

### Epic 6. core 유틸 정리 및 수정

#### [x] Feature 6.1 고아화된 core 유틸 삭제·수정 + index.ts export 정리 + SdBaseContainer 파일/export 삭제(4.1 이관분)

**의존성:** 1.1, 2.1, 3.1, 4.1, 5.1 (모두 완료 후 — 비삭제 사용처가 0이 된 상태에서 안전하게 제거 가능). 5.1 포함 사유: `setupCumulateSelectedKeys` 삭제의 대체 기능이 5.1에서 `<sd-sheet [cumulativeSelection]>`로 제공되어야 소비자가 마이그레이션 가능

**범위:** (세부 계획: [6.1-core-utils-cleanup.md](./6.1-core-utils-cleanup.md), 2026-04-20 plan 확정)

삭제 대상 4종 (파일 전체 삭제):
- `packages/angular/src/core/commons.ts` — `TXT_CHANGE_IGNORE_CONFIRM` 상수 (공개 API로 export 중이나 앱별 커스터마이즈가 더 적합)
- `packages/angular/src/core/withBusy.ts` — `withBusy()` 함수 (레시피에서 직접 sdToast.try로 대체)
- `packages/angular/src/core/selection/setupCumulateSelectedKeys.ts` — 실제로 누적 동작 안 하던 미완성 함수. Feature 5.1에서 `<sd-sheet>` 본체에 정식 구현됨
- `packages/angular/src/core/injectParent.ts` — Angular internal `_lView[8]` 트릭 사용. 본 WBS의 원래 핵심 제거 대상

**SdBaseContainer 파일/export 삭제 (Feature 4.1에서 이관, 사용자 결정 2026-04-20):**
- `packages/angular/src/layout/base-container/sd-base-container.ts` 삭제 (121줄) — 이 시점에 Feature 1.1·2.1 완료로 참조자 0 전제 (`src/data/data-sheet/*`·`src/data/data-detail/*`의 import/사용이 모두 제거됨)
- `packages/angular/src/index.ts:202-203` `// layout/base-container` 주석 및 `export { SdBaseContainer }` 제거
- 디렉토리 `packages/angular/src/layout/base-container/` 가 비어 있으면 디렉토리도 제거

수정 대상 1종:
- `packages/angular/src/core/routing/injectViewTypeSignal.ts` — `getComp: () => object` 인자 제거. 내부에서 `inject(ElementRef)` + `reflectComponentType(activatedRoute.component)?.selector` + `elRef.nativeElement.tagName.toLowerCase()` 비교로 page 판정 (`setupCanDeactivate.ts:22-26`과 동일 패턴). 시그니처 `injectViewTypeSignal(): Signal<SdViewType>`로 단순화. `SdViewType` 타입 export 유지

index.ts export 정리:
- 4종 삭제 심볼의 export 제거
- `injectViewTypeSignal`·`SdViewType` export 유지 (수정만 수행)
- 해당 줄 번호는 Feature 실행 시점에 재확인

tests 정리:
- 4종 삭제 심볼의 `tests/` 내 spec/fixture가 있다면 삭제 (`injectParent.spec.ts`·`withBusy.spec.ts` 등 존재 여부 실행 시 확인)
- `injectViewTypeSignal` 호출 확인된 spec 2개를 신 시그니처(`injectViewTypeSignal()` 인자 없음)로 재작성 (Grep 결과 2026-04-20):
  - `packages/angular/tests/core/modal/modal-integration.spec.ts`
  - `packages/angular/tests/core/routing/view-signals-router-guard.spec.ts`
- `packages/angular/docs/utils.md`·`CLAUDE.md`·`README.md`의 `injectViewTypeSignal` 언급 업데이트 (Grep 결과 확인됨)

docs 정리:
- `packages/angular/docs/` 내 해당 심볼 언급 제거 및 업데이트

Feature 완료 시 `pnpm check -t angular` + `vitest run` 통과 확인

**경계 — 절대 건드리지 않음:**

- `setupCanDeactivate` (src/core/routing/setupCanDeactivate.ts) — 모달/라우트 dual-mode 핵심 기능
- `injectCurrentPageCodeSignal` (src/core/routing/injectCurrentPageCodeSignal.ts)
- `injectViewTitleSignal` (src/core/routing/injectViewTitleSignal.ts)
- `injectFullPageCodeSignal` (sidebar/topbar-menu 사용)
- 모든 provider: `SdToastProvider`·`SdSharedDataProvider`·`SdModalProvider`·`SdModalContentDef`·`SdSelectModal`·`SdSelectModalInfo`·`SdBusyProvider`·`SdAppStructureProvider`·`SdActivatedModalProvider`·`SdSystemLogProvider`
- `SelectModalOutputResult` (sd-modal-select-button.ts가 사용)
- `mark`·`FormatPipe`·`SortingDef`·`SdItemOfTemplate/Context` 등 공용 유지 심볼

**근거:**

- 사용자 심볼별 결정 (대화 2026-04-20, 1/8~8/8 개별 sd-options):
  - 삭제 사유 요약:
    - `TXT_CHANGE_IGNORE_CONFIRM` — 앱별 톤·다국어 커스터마이즈 필요
    - `withBusy` — count/boolean 표현 자유도, sdToast.try 복붙이 오히려 명시적
    - `setupCumulateSelectedKeys` — 실제 누적 동작 미구현 (Feature 5.1로 이관)
    - `injectParent` — Angular internal `_lView[8]` 트릭은 본 WBS 배경에서 핵심 제거 대상으로 명시됨, 버전 업그레이드 리스크
  - 유지 사유:
    - `setupCanDeactivate` — 모달/라우트 dual-mode 20줄 로직 캡슐화, 표준 `setup...` 관용구
    - `injectCurrentPageCodeSignal`·`injectViewTitleSignal` — 라우팅 헬퍼, 서로 연동 유지
  - 수정 사유:
    - `injectViewTypeSignal`의 `getComp: () => this` boilerplate를 공식 API(`ElementRef`·`reflectComponentType`) 조합으로 대체하여 internal 트릭 없이 동일 판정. `injectParent` 재도입 없이 가능 (사용자 제안, 2026-04-20)

---

## 의존성 매트릭스

| Feature | 의존 대상 |
|---------|----------|
| 4.1     | 없음      |
| 5.1     | 없음      |
| 1.1     | 4.1, 5.1 |
| 2.1     | 1.1, 4.1 |
| 3.1     | 1.1, 4.1, 5.1 |
| 6.1     | 1.1, 2.1, 3.1, 4.1, 5.1 |

- **순환 의존**: 없음
- **1단계 (병렬 가능)**: 4.1, 5.1 — 2개. 각자 독립 영역 (4.1=레이아웃 컨테이너/문서, 5.1=sd-sheet 본체)
- **2단계**: 1.1 (← 4.1, 5.1) — `crud-list.md` 레시피가 4.1의 page/modal 분기 패턴, 5.1의 `cumulativeSelection` API를 참조. 모달 `close.emit`은 **기존 계약**(`{ selectedItemKeys, selectedItems }`) 기반으로 작성(sheet의 key는 `selectedItems().map((it, i) => trackByFn()(it, i))` 수동 변환). 1.1에서 "레시피 작성 관용 규칙 1~3"(sd-textfield inset/size, mark(sig) 서술, sortingDefs+orderBy)도 정립되어 2.1/3.1의 결정 파급 선행
- **3단계 (병렬 가능)**: 2.1 (← 1.1, 4.1), 3.1 (← 1.1, 4.1, 5.1) — 2.1은 crud-detail.md 작성, 3.1은 기존 `SdModalSelectButton` 계약 기반 `SdSharedDataSelectButton` 재구현 + data-select-button.md + `SdDataSelectButton`/`SdDataSelectButtonBase` 최종 삭제
- **4단계**: 6.1 (← 1.1, 2.1, 3.1, 4.1, 5.1) — `setupCumulateSelectedKeys` 삭제는 5.1 대체 구현 후, 기타 core 유틸 삭제는 1.1~4.1의 호출부 제거 후 안전
- **주의 — 물리적 충돌 가능 파일**: `index.ts`·`README.md`·`ui-data.md`를 1.1~4.1이 공유 수정. 5.1도 `ui-data.md` 수정(sd-sheet 섹션). 6.1도 `index.ts` 수정. 같은 단계 내 병렬 수행 시 merge 충돌 가능 → Feature별 브랜치 후 순차 merge 권장 (특히 3단계의 2.1·3.1 병렬 시 주의)

---

## 제외 사항

- **버전 정책 결정(14.x minor bump vs 15.0.0 major bump)**: 본 WBS 범위 외. 모든 Feature가 공개 API를 제거하는 breaking change이므로 major bump가 자연스럽지만, 사용자의 릴리즈 정책 결정 사항. Feature 실행 전 별도 확정 필요. (사유: Goal 달성과 독립적, 릴리스 프로세스 결정 영역)
- **외부 소비 앱(모노레포 밖) 마이그레이션 가이드 작성**: 외부 소비자 책임 영역. 단, `packages/angular/CHANGELOG.md` 또는 릴리즈 노트에 breaking change 요약과 레시피 링크를 포함하는 것은 Feature 1.1~4.1의 README/ui-data 정리 범위 내에서 수행 가능. (사유: 외부 영향 범위는 패키지 메인테이너가 결정)
- **신규 composition API(`useDataSheet`, `useDataDetail`) 설계 및 신설**: 사용자 의사결정(2026-04-20)에서 선택지 C로 명시 제시되었으나 평균 5.5점으로 기각됨. 사유: "두 API 공존 → 어떤 걸 쓰지 혼란 증폭". 본 WBS는 삭제 방향만 수행
- **내부 Manager(`injectDataSheet*Manager`, `useDataSheetFilterManager`) 외부 재노출**: 제거 방향 결정으로 불필요. Feature 1.1에서 함께 삭제
- **`getOrmDataEditToastErrorMessage` 제거**: 유지 대상. 공개 API(`index.ts:255`)로 남아 소비 앱이 직접 사용 가능. 삭제 대상 Manager에서 유일하게 호출되던 것이 아니므로 계속 필요
- **`<sd-sheet>`, `<sd-form>`, `<sd-busy-container>`, `<sd-topbar-container>`, `<sd-topbar>`, `<sd-modal-select-button>` 등 표준 컴포넌트 수정**: 이 Feature들의 범위 아님. 레시피가 이들을 **그대로 활용**
- **`SdModalContentDef<R>`, `SdSelectModal<T>`, `SelectModalOutputResult<T>` 인터페이스 제거**: 유지 대상. Base 삭제 후에도 모달·선택 모달 패턴을 소비 화면이 직접 `implements`할 수 있도록 남김
- **SCSS selector 정리**: 조사 결과 `sd-data-sheet`·`sd-data-detail`·`sd-base-container` 관련 selector가 SCSS 파일에 없음(인라인 스타일 사용). 작업 불필요
- **다른 `@simplysm/*` 패키지(core, cli 등) 수정**: 조사 결과 외부 참조 0. 영향 없음

---

## 수행 순서 안내

**1단계 (병렬 수행 가능)**

- Feature 4.1: SdBaseContainer 제거 및 페이지/모달 조립 레시피 확립
- Feature 5.1: `<sd-sheet>`에 cumulativeSelection 옵션 추가

**2단계 (4.1·5.1 완료 후)**

- Feature 1.1: SdDataSheet 추상화 전면 제거 및 리스트 화면 조립 레시피 확립 (← 4.1, 5.1)
  - `crud-list.md`에 4.1의 page/modal 분기 패턴과 5.1의 `cumulativeSelection` 사용 예시 반영
  - 모달 `close.emit(...)`은 기존 계약(`{ selectedItemKeys, selectedItems }`) 기반으로 예시 작성. sheet의 key는 `selectedItems().map((it, i) => trackByFn()(it, i))` 수동 변환 패턴 명시(5.1 범위 269행)
  - "레시피 작성 관용 규칙 1~3"(sd-textfield inset/size, mark(sig) 서술, sortingDefs+orderBy) 정립 → 2.1·3.1 레시피가 이를 따름

**3단계 (1.1 완료 후, 병렬 수행 가능)**

- Feature 2.1: SdDataDetail 추상화 전면 제거 및 상세폼 화면 조립 레시피 확립 (← 1.1, 4.1)
- Feature 3.1: SdDataSelectButton 추상화 제거 및 SdSharedDataSelectButton 재구현 (← 1.1, 4.1, 5.1) — 기존 `SdModalSelectButton` 계약 기반 재구현

**4단계 (1.1·2.1·3.1·4.1·5.1 모두 완료 후)**

- Feature 6.1: core 유틸 삭제 4종 + 수정 1종 + index.ts export 정리

**병렬 수행 시 주의:**

- 1단계(4.1/5.1): 파일 영역이 분리 — 4.1은 `layout/base-container`·`docs/features.md`·`README.md`, 5.1은 `data/sheet/*`·`core/selection/*`·`docs/ui-data.md`(sd-sheet 섹션). 충돌 영역 거의 없음
- 3단계(2.1/3.1): `index.ts`·`README.md`·`ui-data.md`를 공유 수정 → Feature별 브랜치 + 순차 merge 권장

---

## 다음 단계 안내

이 WBS를 기반으로 개별 Feature 구현을 진행하려면 (의존성 순서):

```
# 1단계 (병렬 가능, 4.1·5.1 완료됨)
/sd-dev .tasks/260420163508_remove-data-base-classes/wbs.md 4.1
/sd-dev .tasks/260420163508_remove-data-base-classes/wbs.md 5.1

# 2단계
/sd-dev .tasks/260420163508_remove-data-base-classes/wbs.md 1.1

# 3단계 (병렬 가능)
/sd-dev .tasks/260420163508_remove-data-base-classes/wbs.md 2.1
/sd-dev .tasks/260420163508_remove-data-base-classes/wbs.md 3.1

# 4단계
/sd-dev .tasks/260420163508_remove-data-base-classes/wbs.md 6.1
```

또는 Feature별 계획만 먼저 세우려면:

```
/sd-plan .tasks/260420163508_remove-data-base-classes/wbs.md 1.1
```

**실행 전 확정 필요 사항:**

- 버전 정책 (major bump 여부) — 위 "제외 사항" 참조
- 3단계(2.1/3.1) 병렬 수행 방식 (순차 vs 브랜치 병렬) — 위 "수행 순서 안내" 참조
- Feature 5.1 plan 단계에서 `useSelectionManager` 비교 로직 변경 범위(다른 호출처 영향 포함) 확정 필요 — 이미 5.1 완료([x])됨
