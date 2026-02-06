# Sheet 컴포넌트 Solid 이관 - 의존성 분석

## 개요

Angular의 `sd-sheet` 컴포넌트(`.legacy-packages/sd-angular/src/ui/data/sheet/`)를 SolidJS로 이관하기 위한 의존성 분석 문서.

---

## Angular Sheet 파일 구조

```
.legacy-packages/sd-angular/src/ui/data/sheet/
├── sd-sheet.control.ts                    (메인 컴포넌트, ~973줄)
├── sd-sheet-config.modal.ts               (컬럼 설정 모달, ~278줄)
├── directives/
│   ├── sd-sheet-column.directive.ts       (컬럼 정의 디렉티브)
│   └── sd-sheet-column-cell-template.directive.ts (셀 템플릿 디렉티브)
├── features/
│   ├── SdSheetDomAccessor.ts              (DOM 쿼리 헬퍼)
│   ├── SdSheetLayoutEngine.ts             (헤더/컬럼 레이아웃 계산)
│   ├── SdSheetColumnFixingManager.ts      (고정 컬럼 위치 관리)
│   ├── SdSheetCellAgent.ts                (셀 탐색 & 편집 모드)
│   ├── SdSheetFocusIndicatorRenderer.ts   (포커스 시각 표시)
│   └── SdSheetSelectRowIndicatorRenderer.ts (선택 행 시각 표시)
└── types/
    ├── ISdSheetConfig.ts                  (설정 저장 구조)
    ├── ISdSheetColumnDef.ts               (컬럼 정의 인터페이스)
    ├── ISdSheetHeaderDef.ts               (헤더 셀 인터페이스)
    └── ISdSheetItemKeydownEventParam.ts   (키보드 이벤트 타입)
```

---

## 주요 기능 목록

| 기능 | 설명 |
|------|------|
| 컬럼 정렬 | 헤더 클릭으로 정렬 토글, Shift/Ctrl로 다중 컬럼 정렬 |
| 행 선택 | 단일/다중 선택, Shift 범위 선택, 체크박스 토글 |
| 트리 확장 | `getChildrenFn`으로 계층 구조 표시, 확장/접기 |
| 컬럼 고정 | 좌측 고정 컬럼 (sticky positioning) |
| 컬럼 설정 | 모달로 컬럼 표시/숨김, 순서, 너비, 고정 설정 |
| 셀 편집 | F2로 편집 모드, 화살표키 탐색, Ctrl+C/V |
| 페이지네이션 | 클라이언트/서버 페이징 |
| 멀티레벨 헤더 | `header: string[]`로 다단 헤더, 자동 colspan/rowspan |
| 포커스 표시 | 포커스된 셀에 시각적 보더 |
| 선택 행 표시 | 선택된 행에 반투명 오버레이 |
| 컬럼 리사이즈 | 드래그로 컬럼 너비 조절 |
| 설정 저장 | 시스템 설정 리소스로 설정 영구 저장 |

---

## 의존성 현황

### Solid에 이미 존재하는 컴포넌트

| 의존성 | Solid 위치 | 상태 |
|--------|-----------|------|
| CheckBox | `packages/solid/src/components/form-control/checkbox/CheckBox.tsx` | ✅ 완전 구현 |
| Button | `packages/solid/src/components/form-control/Button.tsx` | ✅ 완전 구현 |
| TextField | `packages/solid/src/components/form-control/field/TextField.tsx` | ✅ 완전 구현 |
| Icon | `packages/solid/src/components/display/Icon.tsx` | ✅ Tabler Icons 래퍼 |
| Select | `packages/solid/src/components/form-control/select/Select.tsx` | ✅ Compound Component |
| Dropdown | `packages/solid/src/components/disclosure/Dropdown.tsx` | ✅ Portal 기반 |
| Collapse | `packages/solid/src/components/disclosure/Collapse.tsx` | ✅ 애니메이션 지원 |
| `usePersisted` | `packages/solid/src/contexts/usePersisted.ts` | ✅ localStorage 저장 |

### Solid에 이미 존재하는 유틸리티 (core-browser/core-common)

| 유틸리티 | 위치 | 비고 |
|---------|------|------|
| `findFirst(selector)` | `core-browser` Element 확장 | ✅ |
| `findAll(selector)` | `core-browser` Element 확장 | ✅ |
| `scrollIntoViewIfNeeded()` | `core-browser` HTMLElement 확장 | ✅ 고정 헤더/열 대응 |
| `getRelativeOffset(parent)` | `core-browser` HTMLElement 확장 | ✅ |
| `getParents()` | `core-browser` Element 확장 | ✅ |
| `html` 태그 함수 | `core-common` template-strings | ✅ |
| `copyElement(event)` | `core-browser` | ✅ (동기, 이벤트 핸들러용) |
| `pasteToElement(event)` | `core-browser` | ✅ (동기, 이벤트 핸들러용) |
| `getBounds(els)` | `core-browser` | ✅ IntersectionObserver 기반 |
| Array `.orderBy()` | `core-common` 확장 | ✅ |
| Array `.filterExists()` | `core-common` 확장 | ✅ |
| `ObjectUtils.equal()` | `core-common` | ✅ |
| `NumberUtils.parseInt()` | `core-common` | ✅ |

### Solid에 없는 것 — 이관 전 구현 필요

#### 1단계: 핵심 유틸리티 (Sheet 로직의 근간)

| 유틸리티 | Angular 위치 | 설명 | 우선순위 |
|---------|-------------|------|---------|
| **SdSortingManager** | `sd-angular/src/core/utils/managers/` | 다중 컬럼 정렬 상태 관리 (`toggle()`, `sort()`) | 🔴 필수 |
| **SdSelectionManager** | `sd-angular/src/core/utils/managers/` | 행 선택 로직 (단일/다중, Shift 범위) | 🔴 필수 |
| **SdExpandingManager** | `sd-angular/src/core/utils/managers/` | 트리 확장/접기, 가시성 계산, 평탄화 | 🔴 필수 |

> **참고**: 이 3개 매니저는 프레임워크 독립적인 상태 관리 로직이므로, Solid의 `createSignal`/`createMemo` 기반으로 재작성하면 됨.

#### 2단계: 필수 UI 컴포넌트

| 컴포넌트 | Angular 위치 | 설명 | 우선순위 |
|---------|-------------|------|---------|
| **Pagination** | `sd-angular/src/ui/nav/` | 페이지 네비게이션 (첫/마지막 페이지, 가시 페이지 수) | 🟡 필수 |
| **Modal/Dialog** | `sd-angular/src/core/providers/` | 모달 표시 (`showAsync()`), 백드롭, 포커스 관리 | 🟡 필수 (설정 모달용) |

#### 3단계: 있으면 좋은 컴포넌트 (우회 가능)

| 컴포넌트 | 설명 | 대안 |
|---------|------|------|
| **BusyContainer** | 로딩 표시 (설정 모달 내) | 간단한 스피너 컴포넌트로 대체 가능 |
| **Tooltip** | 컬럼 헤더 tooltip | `title` HTML 속성으로 대체 가능 |

---

## 누락 DOM 확장 메서드

| 메서드 | 상태 | 대안 |
|--------|------|------|
| `findParent(selector)` | ❌ 없음 | `element.closest(selector)` 표준 API 사용 |
| `findFirstFocusableChild()` | ⚠️ 타입만 선언, 구현 없음 | 직접 구현 필요 (Sheet 셀 탐색에 사용) |
| `copyAsync()` | ❌ 없음 | `navigator.clipboard.writeText()` 직접 사용 |
| `pasteAsync()` | ❌ 없음 | `navigator.clipboard.readText()` 직접 사용 |

---

## Sheet 내부 Feature 클래스 (Solid에서 재작성 필요)

이 클래스들은 Sheet 전용이므로 Sheet 이관 시 함께 작성:

| 클래스 | 역할 | 복잡도 |
|--------|------|--------|
| `SdSheetLayoutEngine` | 헤더/컬럼 레이아웃 계산, config 적용 | 높음 |
| `SdSheetColumnFixingManager` | 고정 컬럼 sticky left 계산 | 중간 |
| `SdSheetCellAgent` | 셀 탐색, 편집 모드, 복사/붙여넣기 | 높음 |
| `SdSheetFocusIndicatorRenderer` | 포커스 셀 시각 표시 | 중간 |
| `SdSheetSelectRowIndicatorRenderer` | 선택 행 시각 표시 | 낮음 |
| `SdSheetDomAccessor` | DOM 쿼리 래퍼 | 낮음 |

---

## 사용되는 아이콘

Sheet에서 사용하는 Tabler Icons:

- `tablerSettings` — 설정 버튼
- `tablerCaretRight` — 확장/접기 표시
- `tablerArrowsSort` — 다중 정렬 표시
- `tablerSortAscending` / `tablerSortDescending` — 정렬 방향
- `tablerArrowRight` — 단일 선택 표시
- `tablerChevronUp` / `tablerChevronDown` — 컬럼 순서 변경
- `tablerX` — 숨김 컬럼 표시

---

## 권장 이관 순서

```
1단계: 핵심 매니저 (SortingManager → SelectionManager → ExpandingManager)
   ↓
2단계: 필수 UI (Pagination → Modal)
   ↓
3단계: Sheet 본체 이관
   ↓
4단계: 부가 기능 (BusyContainer, Tooltip 등)
```

---

## 기술적 고려사항

### Solid 특성 반영
- Angular의 `input()`/`output()`/`model()` → Solid의 `props` + `createPropSignal` 패턴
- Angular의 `@contentChild` 템플릿 → Solid의 `children()` + slot 패턴 또는 Compound Component
- Angular의 `afterEveryRender()` → Solid의 `createEffect()` 또는 `onMount()`
- Angular의 `$signal`/`$computed` → Solid의 `createSignal`/`createMemo`
- Angular의 CSS 변수 기반 스타일링 → Tailwind CSS 클래스 기반

### 성능 관련
- 현재 Angular 구현에 가상 스크롤링 없음 (모든 행 렌더링)
- Solid의 fine-grained reactivity로 불필요한 리렌더 최소화 가능
- 고정 컬럼의 sticky positioning은 CSS로 처리 (프레임워크 독립)
