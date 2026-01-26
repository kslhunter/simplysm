# sd-angular → solid 마이그레이션 순서

`.legacy-packages/sd-angular` 컴포넌트를 `packages/solid`로 마이그레이션하는 순서입니다.

---

## 마이그레이션 분류 기준

| 분류 | 설명 |
|------|------|
| **마이그레이션** | Solid로 옮겨야 함 |
| **Solid 기본** | Solid 기본 기능으로 대체 (마이그레이션 불필요) |
| **이미 완료** | packages/solid에 이미 구현됨 |
| **컴포넌트 내** | 개별 컴포넌트 구현 시 필요하면 추가 |
| **불필요** | Solid에서 필요 없거나 다른 방식으로 처리 |

---

## 기반 유틸리티 분석

### Signal/Reactive 시스템
| Angular | Solid | 분류 | 비고 |
|---------|-------|------|------|
| `$signal()` | `createSignal()` | Solid 기본 | Solid 기본 제공 |
| `$computed()` | `createMemo()` | Solid 기본 | Solid 기본 제공 |
| `$effect()` | `createEffect()` | Solid 기본 | Solid 기본 제공 |
| `$resource()` | `createResource()` | Solid 기본 | Solid 기본 제공 |
| `$afterRenderEffect()` | - | 불필요 | Solid는 fine-grained reactivity |

### Transform 함수
| Angular | Solid | 분류 | 비고 |
|---------|-------|------|------|
| `transformBoolean` | - | 불필요 | Solid는 props 타입으로 처리 |
| `transformNullableBoolean` | - | 불필요 | Solid는 props 타입으로 처리 |

### Manager 클래스
| 항목 | 분류 | 비고 |
|------|------|------|
| `SdExpandingManager` | 마이그레이션 | 프레임워크 독립적 로직, Sheet에서 사용 |
| `SdSelectionManager` | 마이그레이션 | 프레임워크 독립적 로직, Sheet에서 사용 |
| `SdSortingManager` | 마이그레이션 | 프레임워크 독립적 로직, Sheet에서 사용 |

---

## 디렉티브 분석

| Angular | Solid | 분류 | 비고 |
|---------|-------|------|------|
| `sd-ripple` | `use:ripple` | 이미 완료 | `packages/solid/src/directives/ripple.ts` |
| `sd-invalid` | CSS `:invalid` 또는 props | 불필요 | 컴포넌트별로 `invalid` prop 사용 |
| `sd-events` | JSX 이벤트 핸들러 | 불필요 | Solid는 `oncapture:click`, `on:click` 등 지원 |
| `sd-show-effect` | CSS transition | 불필요 | Solid의 `<Show>` + CSS로 처리 |
| `sd-router-link` | `@solidjs/router` | Solid 기본 | `<A>` 컴포넌트 사용 |

### sd-events 상세 분석 (마이그레이션 불필요)
```tsx
// Angular (sd-events 디렉티브 필요)
<div (click.capture)="onClick($event)">

// Solid (기본 지원)
<div oncapture:click={onClick}>
// 또는
<div on:click={onClick} attr:capture>
// 또는 addEventListener 직접 사용
```

---

## Provider → Context 분석

| Angular Provider | Solid | 분류 | 비고 |
|-----------------|-------|------|------|
| `SdAngularConfigProvider` | Context | 컴포넌트 내 | 필요시 Context 생성 |
| `SdSystemConfigProvider` | Context | 컴포넌트 내 | 테마/설정 관련 |
| `SdLocalStorageProvider` | 직접 사용 | 불필요 | `localStorage` 직접 접근 가능 |
| `SdSharedDataProvider` | Context 또는 Store | 마이그레이션 | 전역 상태 필요시 |
| `SdFileDialogProvider` | 유틸 함수 | 컴포넌트 내 | Context 불필요, 함수로 구현 |
| `SdModalProvider` | Context | 마이그레이션 | 모달 시스템 필요 |
| `SdToastProvider` | Context | 마이그레이션 | 토스트 시스템 필요 |
| `SdBusyProvider` | Context | 마이그레이션 | 로딩 시스템 필요 |

---

## 이미 구현 완료된 컴포넌트

`packages/solid/src/` 현재 상태:

| 컴포넌트 | 상태 |
|---------|------|
| `SdAnchor` | 완료 |
| `SdButton` | 완료 |
| `SdCheckbox` | 완료 |
| `SdList` | 완료 |
| `SdListItem` | 완료 |
| `SdCollapse` | 완료 |
| `SdCollapseIcon` | 완료 |
| `SdSidebarContainer` | 완료 |
| `SdSidebar` | 완료 |
| `SdSidebarMenu` | 완료 |
| `SdSidebarUser` | 완료 |
| `SdTextField` | 완료 |
| `SdNumberField` | 완료 |
| `SdDateField` | 완료 |
| `SdTimeField` | 완료 |
| `SdDateTimeField` | 완료 |
| `SdFormatField` | 완료 |
| `SdColorField` | 완료 |
| `ThemeContext` | 완료 |
| `SidebarContext` | 완료 |
| `SdContext` | 완료 |
| `ripple` (directive) | 완료 |
| `useMediaQuery` (hook) | 완료 |

---

## 마이그레이션 순서 (권장)

### Phase 1: 기본 컴포넌트 (의존성 없음)

| # | 컴포넌트 | 원본 | 비고 |
|---|---------|------|------|
| ~~1~~ | ~~SdAnchor~~ | ~~`ui/form/button/sd-anchor`~~ | 완료 |
| ~~2~~ | ~~SdCheckbox~~ | ~~`ui/form/choice/sd-checkbox`~~ | 완료 |
| 3 | SdSwitch | `ui/form/choice/sd-switch` | 스위치 |
| ~~4~~ | ~~SdTextfield~~ | ~~`ui/form/input/sd-textfield`~~ | 완료 |
| ~~5~~ | ~~SdTextarea~~ | ~~`ui/form/input/sd-textarea`~~ | 완료 |
| 6 | SdLabel | `ui/visual/sd-label` | 레이블 |
| 7 | SdNote | `ui/visual/sd-note` | 노트 |
| 8 | SdProgress | `ui/visual/sd-progress` | 진행바 |

**메모**:
- SdCheckboxGroup: SdCheckbox 완료 후 별도로 구현 필요
- SdRadio + SdRadioGroup: SdCheckbox 참고하여 별도로 구현 필요 (radio 기능은 분리됨)

### Phase 2: 레이아웃 (의존성 없음)

| # | 컴포넌트 | 원본 | 비고 |
|---|---------|------|------|
| 9 | SdCard | `ui/layout/sd-card` | 카드 (Tailwind로 대체 가능) |
| 10 | SdPane | `ui/layout/sd-pane` | 페인 |
| 11 | SdGap | `ui/layout/sd-gap` | 갭 (Tailwind gap으로 대체 가능) |
| 12 | SdFlex | `ui/layout/flex/` | 플렉스 (Tailwind로 대체 가능) |
| 13 | SdGrid | `ui/layout/grid/` | 그리드 (Tailwind로 대체 가능) |
| 14 | SdDock | `ui/layout/dock/` | 독 레이아웃 |
| 15 | SdFormBox | `ui/layout/form/` | 폼 박스 |

### Phase 3: 중급 컴포넌트

| # | 컴포넌트 | 원본 | 의존성 |
|---|---------|------|--------|
| 16 | SdDropdownPopup | `ui/overlay/dropdown/` | 없음 |
| 17 | SdDropdown | `ui/overlay/dropdown/` | SdDropdownPopup |
| 18 | SdSelectItem | `ui/form/select/` | 없음 |
| 19 | SdSelect | `ui/form/select/` | SdDropdown, SdSelectItem |
| 20 | SdTab | `ui/navigation/tab/` | 없음 |
| 21 | SdTabItem | `ui/navigation/tab/` | SdTab |
| 22 | SdTabview | `ui/navigation/tab/` | 없음 |
| 23 | SdPagination | `ui/navigation/` | SdAnchor |

### Phase 4: 오버레이 시스템

| # | 컴포넌트 | 원본 | 의존성 |
|---|---------|------|--------|
| 24 | SdBusyContainer | `ui/overlay/busy/` | 없음 |
| 25 | BusyContext | `ui/overlay/busy/` | SdBusyContainer |
| 26 | SdToast | `ui/overlay/toast/` | 없음 |
| 27 | ToastContext | `ui/overlay/toast/` | SdToast |
| 28 | SdModal | `ui/overlay/modal/` | SdAnchor |
| 29 | ModalContext | `ui/overlay/modal/` | SdModal |

### Phase 5: 네비게이션 (일부 완료)

| # | 컴포넌트 | 원본 | 상태 |
|---|---------|------|------|
| - | SdSidebarContainer | - | 이미 완료 |
| - | SdSidebar | - | 이미 완료 |
| - | SdSidebarMenu | - | 이미 완료 |
| - | SdSidebarUser | - | 이미 완료 |
| 30 | SdTopbarContainer | `ui/navigation/topbar/` | 마이그레이션 |
| 31 | SdTopbar | `ui/navigation/topbar/` | 마이그레이션 |
| 32 | SdTopbarMenu | `ui/navigation/topbar/` | 마이그레이션 |
| 33 | SdTopbarUser | `ui/navigation/topbar/` | 마이그레이션 |
| 34 | SdKanban | `ui/layout/kanban/` | 마이그레이션 |

### Phase 6: 데이터 컴포넌트 (고복잡도)

| # | 컴포넌트 | 원본 | 의존성 |
|---|---------|------|--------|
| 35 | SdCalendar | `ui/visual/sd-calendar` | 없음 |
| 36 | Manager 클래스 | `core/utils/managers/` | 없음 (순수 로직) |
| 37 | Sheet Features | `ui/data/sheet/features/` | Manager |
| 38 | SdSheet | `ui/data/sheet/` | Features, 여러 컴포넌트 |

### Phase 7: 고수준 기능 (선택적)

| # | 컴포넌트 | 원본 | 비고 |
|---|---------|------|------|
| 39 | SdBaseContainer | `features/base/` | 앱 레이아웃 템플릿 |
| 40 | SdThemeSelector | `features/theme/` | 테마 선택기 |
| 41 | SdPermissionTable | `features/permission-table/` | SdSheet 필요 |
| 42 | SdSharedDataSelect | `features/shared-data/` | SdSelect 필요 |
| 43 | SdDataSheet | `features/data-view/` | SdSheet 래퍼 |
| 44 | SdAddressSearch | `features/address/` | 모달 + 리스트 |

---

## Tailwind로 대체 가능한 항목

다음 항목들은 Tailwind CSS 유틸리티로 대체 가능합니다:

| Angular | Tailwind 대체 |
|---------|--------------|
| `SdCard` | `rounded-lg shadow-md p-4 bg-white` |
| `SdGap` | `gap-*` 클래스 |
| `SdFlex` | `flex flex-row gap-*` |
| `SdGrid` | `grid grid-cols-* gap-*` |
| `SdPane` | `p-* overflow-auto` |

필요에 따라 컴포넌트로 만들거나 Tailwind 클래스를 직접 사용할 수 있습니다.

---

## 요약

| 분류 | 개수 | 비고 |
|------|------|------|
| 이미 완료 | 23개 | Anchor, Button, List, Sidebar, Field 등 |
| 마이그레이션 필요 | ~21개 | 순서대로 진행 |
| Solid 기본 기능 | ~10개 | Signal, Router 등 |
| 불필요 | ~8개 | Angular 전용 헬퍼 |
| Tailwind 대체 가능 | 5개 | 레이아웃 유틸리티 |
