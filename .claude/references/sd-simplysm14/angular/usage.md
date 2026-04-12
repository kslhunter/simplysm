# @simplysm/angular

Angular 21 기반 UI 컴포넌트 라이브러리. Zoneless, signal-based, standalone 컴포넌트로 구성된다.

## Installation

```bash
npm install @simplysm/angular
```

## API Overview

### Bootstrap

| API | Type | Description |
|-----|------|-------------|
| `provideSdAngular` | function | 모든 기반 설정을 제공하는 환경 프로바이더 팩토리 |
| `SdAngularConfigProvider` | class | `clientName` 설정을 보유하는 프로바이더 |
| `TXT_CHANGE_IGNORE_CONFIRM` | const | 변경사항 무시 확인 메시지 문자열 |

-> See [docs/bootstrap.md](./docs/bootstrap.md) for details.

### Providers

| API | Type | Description |
|-----|------|-------------|
| `SdThemeProvider` | class | 다크모드/폰트 크기 프로바이더 (`dark`, `fontSize` signal) |
| `SdThemeSelector` | component | 테마 설정 드롭다운 (다크모드 토글, 폰트 크기 조절) |
| `SdSystemLogProvider` | class | 시스템 로그 기록 프로바이더 |
| `SdAppStructureProvider` | class | 앱 구조(메뉴/권한) 관리 프로바이더 |
| `injectPermsSignal` | function | 현재 뷰의 권한 목록을 signal로 반환 |
| `SdAppStructureUtils` | class | 앱 구조 유틸리티 (메뉴/권한 조회 정적 메서드) |
| `SdFileDialogProvider` | class | 네이티브 파일 선택 대화상자 프로바이더 |
| `SdLocalStorageProvider` | class | `clientName` 스코프 localStorage 래퍼 |
| `SdSystemConfigProvider` | class | 비동기 설정 저장/조회 프로바이더 |
| `SdServiceClientFactoryProvider` | class | ServiceClient 인스턴스 팩토리/관리 |
| `SdSharedDataProvider` | class | 이벤트 기반 공유 데이터 캐시 추상 프로바이더 |
| `SdSharedDataChangeEvent` | const | 공유 데이터 변경 이벤트 정의 |
| `SdNavigateWindowProvider` | class | 새 윈도우 네비게이션 + 자동 닫기 |
| `SdActivatedModalProvider` | class | 모달 내부에서 inject하여 모달/컨텐츠 참조 |
| `SdToastProvider` | class | 토스트 알림 (info/success/warning/danger) |
| `SdBusyProvider` | class | 글로벌 busy 상태 관리 (spinner/bar/cube) |
| `SdPrintProvider` | class | 인쇄 및 PDF 생성 프로바이더 |
| `SdModalProvider` | class | 프로그래밍 방식 모달 생성 |

-> See [docs/providers.md](./docs/providers.md) for details.

### Provider Types

| API | Type | Description |
|-----|------|-------------|
| `AppStructureItem` | type | 앱 구조 항목 (그룹 또는 리프) |
| `SdMenu` | interface | 메뉴 트리 노드 |
| `SdFlatMenu` | interface | 플랫 메뉴 항목 |
| `SdPermission` | interface | 권한 트리 노드 |
| `SharedDataBase` | interface | 공유 데이터 기본 인터페이스 |
| `SharedDataInfo` | interface | 공유 데이터 등록 정보 |
| `SharedDataHandle` | interface | 공유 데이터 핸들 (items signal + get) |
| `SdModalContentDef` | interface | 모달 컴포넌트 구현 인터페이스 |
| `SdModalInfo` | interface | 모달 생성 시 전달하는 정보 |
| `SdModalOptions` | interface | 모달 옵션 (크기, 위치, 동작) |
| `SdToastContentDef` | interface | 토스트 컴포넌트 구현 인터페이스 |
| `SdToastInput` | interface | 커스텀 토스트 생성 입력 |
| `SdToastSeverity` | type | 토스트 심각도 (`"info" \| "success" \| "warning" \| "danger"`) |
| `SdToastTheme` | type | 토스트 테마 (severity + `"primary" \| "secondary" \| "gray" \| "blue-gray"`) |
| `SdBusyType` | type | busy 표시 유형 (`"spinner" \| "bar" \| "cube"`) |
| `SdPrint` | interface | 인쇄 컴포넌트 구현 인터페이스 |
| `SdPrintInput` | interface | 인쇄 생성 입력 |
| `SelectModalOutputResult` | interface | 모달 선택 결과 (`selectedItemKeys`, `selectedItems`) |

-> See [docs/provider-types.md](./docs/provider-types.md) for details.

### Directives

| API | Type | Description |
|-----|------|-------------|
| `SdEvents` | directive | `.capture`, `.passive`, `.once` 수식어 및 커스텀 이벤트 바인딩 |
| `SdRipple` | directive | `[sdRipple]` 리플 효과 |
| `SdShowEffect` | directive | `[sdShowEffect]` 뷰포트 진입 시 reveal 애니메이션 |
| `SdInvalid` | directive | `[sdInvalid]` 유효성 검증 표시기 |
| `SdTypedTemplate` | directive | `ng-template[typed]` 템플릿 컨텍스트 타입 가드 |
| `SdItemOfTemplate` | directive | `ng-template[itemOf]` 항목 반복 템플릿 타입 가드 |
| `SdItemOfTemplateContext` | interface | itemOf 템플릿 컨텍스트 (`$implicit`, `item`, `index`, `depth`) |
| `SdRouterLink` | directive | `[sdRouterLink]` 라우터 네비게이션 (Ctrl+클릭 새 창) |

-> See [docs/directives.md](./docs/directives.md) for details.

### Plugins

| API | Type | Description |
|-----|------|-------------|
| `SdSaveCommandEventPlugin` | class | `(sdSaveCommand)` Ctrl+S 이벤트 플러그인 |
| `SdRefreshCommandEventPlugin` | class | `(sdRefreshCommand)` Ctrl+Alt+L 이벤트 플러그인 |
| `SdInsertCommandEventPlugin` | class | `(sdInsertCommand)` Ctrl+Insert 이벤트 플러그인 |
| `SdResizeEventPlugin` | class | `(sdResize)` ResizeObserver 이벤트 플러그인 |
| `SdResizeEvent` | interface | resize 이벤트 데이터 |
| `SdIntersectionEventPlugin` | class | `(sdIntersection)` IntersectionObserver 이벤트 플러그인 |
| `SdIntersectionEvent` | interface | intersection 이벤트 데이터 |
| `SdOptionEventPlugin` | class | `.capture`, `.passive`, `.once` 이벤트 옵션 플러그인 |
| `SdGlobalErrorHandlerPlugin` | class | 글로벌 에러 핸들러 (PromiseRejection, ErrorEvent 등) |

-> See [docs/plugins.md](./docs/plugins.md) for details.

### Pipes

| API | Type | Description |
|-----|------|-------------|
| `FormatPipe` | pipe | DateTime/DateOnly/string 포매팅 파이프 |

-> See [docs/pipes.md](./docs/pipes.md) for details.

### Utils & Setups

| API | Type | Description |
|-----|------|-------------|
| `mark` | function | WritableSignal 변경 알림 트리거 (shallow copy) |
| `withBusy` | function | busy count 증감과 함께 비동기 작업 실행 |
| `injectParent` | function | 가장 가까운 부모 컴포넌트 인스턴스 주입 |
| `setSafeStyle` | function | Renderer2로 여러 CSS 스타일 일괄 적용 |
| `injectSdSystemConfigResource` | function | 시스템 설정 resource 래퍼 |
| `injectCurrentPageCodeSignal` | function | 현재 페이지 코드 signal |
| `injectFullPageCodeSignal` | function | 전체 페이지 코드 signal (NavigationEnd 기반) |
| `injectViewTitleSignal` | function | 현재 뷰 타이틀 signal |
| `injectViewTypeSignal` | function | 현재 뷰 타입 signal (`page \| modal \| control`) |
| `useSelectionManager` | function | 선택 관리 composable (single/multi) |
| `useSortingManager` | function | 정렬 관리 composable |
| `useExpandingManager` | function | 트리 확장/축소 관리 composable |
| `setupBgTheme` | function | body 배경 테마 색상 설정 |
| `setupRipple` | function | 리플 효과 설정 |
| `setupRevealOnShow` | function | 뷰포트 진입 시 reveal 애니메이션 설정 |
| `setupInvalid` | function | 유효성 검증 표시기 설정 |
| `setupModelHook` | function | model signal의 set을 가드 함수로 래핑 |
| `setupCanDeactivate` | function | 모달/라우트 canDeactivate 설정 |
| `setupCumulateSelectedKeys` | function | 선택된 항목의 키 누적 동기화 |
| `setupCloserWhenSingleSelectionChange` | function | 단일 선택 변경 시 모달 자동 닫기 |

-> See [docs/utils.md](./docs/utils.md) for details.

### Type Utilities

| API | Type | Description |
|-----|------|-------------|
| `DirectiveInputSignals` | type | InputSignal 프로퍼티에서 값 타입 추출 |
| `UndefToOptional` | type | undefined 포함 프로퍼티를 optional로 변환 |
| `WithOptional` | type | 특정 키를 optional로 변환 |
| `SdViewType` | type | 뷰 타입 (`"page" \| "modal" \| "control"`) |
| `SortingDef` | interface | 정렬 정의 (`key`, `desc`) |
| `ExpandItemDef` | interface | 트리 확장 항목 정의 |
| `SdSelectModal` | interface | 모달 선택 컴포넌트 인터페이스 |
| `SdSelectModalInfo` | type | 모달 선택 정보 타입 |
| `SdTextfieldTypes` | type | 텍스트필드 타입별 값 타입 매핑 |
| `sdTextfieldTypes` | const | 텍스트필드 타입 문자열 배열 |
| `SelectModeValue` | type | select mode별 value 타입 매핑 |

-> See [docs/type-utilities.md](./docs/type-utilities.md) for details.

### Features

| API | Type | Description |
|-----|------|-------------|
| `SdBaseContainer` | component | 페이지/모달/뷰 공통 레이아웃 컨테이너 |
| `SdAddressSearchModal` | component | Daum Postcode 주소 검색 모달 |
| `Address` | interface | 주소 검색 결과 |
| `SdPermissionTable` | component | 권한 매트릭스 테이블 |
| `SdDataSheetBase` | class | 데이터 시트 CRUD 추상 클래스 |
| `SdDataSheet` | component | 데이터 시트 presentation 컴포넌트 |
| `SdDataSheetColumn` | directive | 데이터 시트 컬럼 (edit 추가) |
| `SdDataDetailBase` | class | 상세 폼 추상 클래스 |
| `SdDataDetail` | component | 상세 폼 presentation 컴포넌트 |
| `SdDataSelectButtonBase` | class | 모달 기반 선택 버튼 추상 클래스 |
| `SdDataSelectButton` | component | 선택 버튼 presentation 컴포넌트 |
| `SdSharedDataSelect` | component | 공유 데이터 드롭다운 선택 |
| `SdSharedDataSelectButton` | component | 공유 데이터 모달 선택 버튼 |
| `SdSharedDataSelectList` | component | 공유 데이터 목록형 선택 |
| `matchesSearchText` | function | 공백 구분 AND 조건 텍스트 검색 매칭 |

-> See [docs/features.md](./docs/features.md) for details.

### Feature Types

| API | Type | Description |
|-----|------|-------------|
| `SdDataSheetItemPropInfo` | interface | 데이터 시트 항목 속성 정보 |
| `SdDataSheetItemInfo` | interface | 데이터 시트 항목 정보 (key, canSelect 등) |
| `SdDataSheetSearchResult` | interface | 데이터 시트 검색 결과 |
| `SdDataDetailDataInfo` | interface | 상세 폼 데이터 정보 |

-> See [docs/features.md](./docs/features.md) for details.

### UI - Layout

| API | Type | Description |
|-----|------|-------------|
| `SdDockContainer` | component | 도킹 레이아웃 컨테이너 |
| `SdDock` | component | 도킹 영역 (top/bottom/left/right) |
| `SdGap` | component | 간격 (gap) 컴포넌트 |
| `SdKanbanBoard` | component | 칸반 보드 (드래그앤드롭) |
| `SdKanbanBoardDropInfo` | interface | 칸반 보드 드롭 이벤트 정보 |
| `SdKanbanDragRef` | interface | 칸반 드래그 참조 인터페이스 |
| `SdKanbanDropTarget` | interface | 칸반 드롭 타겟 인터페이스 |
| `SdKanban` | component | 칸반 아이템 |
| `SdKanbanLane` | component | 칸반 레인 |

-> See [docs/ui-layout.md](./docs/ui-layout.md) for details.

### UI - Form

| API | Type | Description |
|-----|------|-------------|
| `SdButton` | component | 버튼 |
| `SdAnchor` | component | 앵커 (인라인 버튼) |
| `SdAdditionalButton` | component | 추가 동작 버튼 (드롭다운 포함) |
| `SdModalSelectButton` | component | 모달 선택 버튼 |
| `SdTextfield` | component | 텍스트 입력 (13가지 타입: number, text, password, color, email, format, date, month, year, datetime, datetime-sec, time, time-sec) |
| `SdTextarea` | component | 멀티라인 텍스트 입력 |
| `SdNumpad` | component | 숫자 패드 |
| `SdRange` | component | 범위 슬라이더 |
| `SdDateRangePicker` | component | 날짜 범위 선택기 |
| `SdStatePreset` | component | 상태 프리셋 저장/불러오기 |
| `SdStatePresetDef` | interface | 상태 프리셋 데이터 (name, state) |
| `SdCheckbox` | component | 체크박스 |
| `SdSwitch` | component | 스위치 토글 |
| `SdCheckboxGroup` | component | 체크박스 그룹 |
| `SdCheckboxGroupItem` | component | 체크박스 그룹 항목 |
| `SdTiptapEditor` | component | TipTap 리치 텍스트 에디터 |
| `SdSelect` | component | 드롭다운 선택 (single/multi/multi-with-header) |
| `SdSelectItem` | component | 드롭다운 선택 항목 |
| `SdSelectButton` | component | 버튼 스타일 선택 |
| `SdForm` | component | 폼 래퍼 (submit 이벤트, busy 관리) |

-> See [docs/ui-form.md](./docs/ui-form.md) for details.

### UI - Navigation

| API | Type | Description |
|-----|------|-------------|
| `SdCollapse` | component | 접기/펼치기 패널 |
| `SdCollapseIcon` | component | 접기/펼치기 아이콘 |
| `SdTab` | component | 탭 컨테이너 |
| `SdTabItem` | component | 탭 항목 |
| `SdPagination` | component | 페이지네이션 |
| `SdSidebarContainer` | component | 사이드바 컨테이너 |
| `SdSidebar` | component | 사이드바 |
| `SdSidebarMenu` | component | 사이드바 메뉴 |
| `SdSidebarUser` | component | 사이드바 사용자 영역 |
| `SdSidebarUserMenu` | interface | 사이드바 사용자 메뉴 항목 |
| `SdTopbarContainer` | component | 탑바 컨테이너 |
| `SdTopbar` | component | 탑바 |
| `SdTopbarMenu` | component | 탑바 메뉴 |
| `SdTopbarUser` | component | 탑바 사용자 영역 |
| `SdTopbarUserMenu` | interface | 탑바 사용자 메뉴 항목 |
| `getMenuRouterLinkOption` | function | 메뉴에서 라우터 링크 옵션 추출 |
| `getIsMenuSelected` | function | 메뉴 선택 여부 확인 |

-> See [docs/ui-navigation.md](./docs/ui-navigation.md) for details.

### UI - Data

| API | Type | Description |
|-----|------|-------------|
| `SdList` | component | 리스트 |
| `SdListItem` | component | 리스트 항목 |
| `SdSheet` | component | 스프레드시트 (정렬, 고정, 리사이즈) |
| `SdSheetColumn` | directive | 시트 컬럼 정의 |
| `SdSheetConfigModal` | component | 시트 설정 모달 |
| `SdSheetColumnDef` | interface | 시트 컬럼 정의 데이터 |
| `SdSheetConfig` | interface | 시트 설정 데이터 |
| `SdSheetHeaderDef` | interface | 시트 헤더 정의 |
| `SdSheetItemKeydownEventParam` | interface | 시트 항목 keydown 이벤트 파라미터 |
| `SdSheetCellKeydownEventParam` | interface | 시트 셀 keydown 이벤트 파라미터 |

-> See [docs/ui-data.md](./docs/ui-data.md) for details.

### UI - Visual

| API | Type | Description |
|-----|------|-------------|
| `SdLabel` | component | 라벨 (테마, 크기) |
| `SdNote` | component | 노트/알림 메시지 |
| `SdProgress` | component | 진행률 바 |
| `SdCalendar` | component | 캘린더 |
| `SdBarcode` | component | 바코드 생성 (bwip-js) |
| `SdEcharts` | component | ECharts 차트 래퍼 |
| `BarcodeType` | type | 바코드 타입 |

-> See [docs/ui-visual.md](./docs/ui-visual.md) for details.

### UI - Overlay

| API | Type | Description |
|-----|------|-------------|
| `SdDropdown` | component | 드롭다운 트리거 |
| `SdDropdownPopup` | component | 드롭다운 팝업 |
| `SdModal` | component | 모달 래퍼 컴포넌트 |
| `SdPromptModal` | component | 프롬프트 입력 모달 |
| `SdConfirmModal` | component | 확인/취소 모달 |
| `SdToast` | component | 토스트 개별 항목 |
| `SdToastContainer` | component | 토스트 컨테이너 |
| `SdBusyContainer` | component | busy 표시 컨테이너 |

-> See [docs/ui-overlay.md](./docs/ui-overlay.md) for details.

### Styling

| API | Type | Description |
|-----|------|-------------|
| `.flex-row`, `.flex-column` 등 | CSS class | Flexbox 레이아웃 유틸리티 |
| `.grid`, `.grid-{1..12}` | CSS class | Grid 레이아웃 유틸리티 |
| `.card` | CSS class | 카드 스타일 |
| `.form-box`, `.form-table` | CSS class | 폼 레이아웃 |
| `.table` | CSS class | 테이블 스타일 |
| `.p-*`, `.m-*`, `.gap-*` 등 | CSS class | 간격 유틸리티 |
| `--theme-*-*` | CSS custom property | OKLCH 색상 팔레트 (17+5색 x 7단계) |
| `.sd-theme-dark` | theme class | 다크 모드 테마 |

-> See [docs/styling.md](./docs/styling.md) for details.

## 컴포넌트 비동기 초기화 규칙

컴포넌트에서 비동기 초기화가 필요한 경우 `async ngOnInit()`을 사용한다.

```typescript
export class SomePage implements OnInit {
  busyCount = signal(0);

  async ngOnInit() {
    this.busyCount.update((v) => v + 1);
    await this._sdToast.try(async () => {
      // 비동기 초기화 로직
    });
    this.busyCount.update((v) => v - 1);
  }
}
```

- constructor 내 `void (async () => { ... })()` IIFE 패턴 **금지**
- constructor 내 `void this._init()` 같은 수동 호출 패턴 **금지** — ngOnInit이 이미 같은 역할
- `resource()` / `httpResource()`는 데이터 로딩 → signal 매핑 용도. 사이드이펙트(라우팅, toast 등) 포함 초기화에는 사용하지 않는다

## Usage Examples

### 앱 부트스트랩

```typescript
import { provideSdAngular } from "@simplysm/angular";

bootstrapApplication(AppComponent, {
  providers: [
    provideSdAngular({ clientName: "my-app" }),
    provideRouter(routes),
  ],
});
```

### 모달 표시

```typescript
import { SdModalProvider, type SdModalInfo } from "@simplysm/angular";

const sdModal = inject(SdModalProvider);

const result = await sdModal.showAsync(
  { title: "사용자 선택", type: UserSelectModal, inputs: { filter: "active" } },
  { useCloseByBackdrop: true },
);
```

### 서비스 + 이벤트 프록시 (AppServiceProvider 패턴)

소비 프로젝트에서 서비스와 이벤트를 한 곳에서 관리하는 패턴:

```typescript
import { inject, Injectable } from "@angular/core";
import { SdServiceClientFactoryProvider } from "@simplysm/angular";
import { createOrmClientConnector, type OrmClientConnector, type ServiceProxy } from "@simplysm/service-client";
import type { SystemLogServiceType } from "@my-server-package";
import type { OrderUpdatedEvent } from "@my-server-package"; // import type만 가능

@Injectable({ providedIn: "root" })
export class AppServiceProvider {
  private readonly _sdServiceClientFactory = inject(SdServiceClientFactoryProvider);

  get client() {
    return this._sdServiceClientFactory.get("MAIN");
  }

  // 서비스 프록시 — getService() 패턴
  get systemLog() {
    return this.client.getService<SystemLogServiceType>("SystemLog");
  }

  // 이벤트 프록시 — getEvent() 패턴 (getService()와 동일)
  get orderUpdated() {
    return this.client.getEvent<typeof OrderUpdatedEvent>("OrderUpdated");
  }
}
```

사용처에서:

```typescript
const appSvc = inject(AppServiceProvider);

// 서비스 호출
await appSvc.systemLog.writeLog("hello");

// 이벤트 구독 — 이벤트 이름과 제네릭 타입을 반복 지정할 필요 없음
const key = await appSvc.orderUpdated.addListener({ orderId: 123 }, async (data) => {
  // data.status는 string으로 타입 추론
});

// 이벤트 발행
await appSvc.orderUpdated.emit((info) => info.orderId === 123, { status: "shipped" });

// 구독 해제
await appSvc.orderUpdated.removeListener(key);
```

### 토스트 알림

```typescript
import { SdToastProvider } from "@simplysm/angular";

const sdToast = inject(SdToastProvider);

sdToast.success("저장되었습니다.");
const result = await sdToast.try(async () => {
  return await someAsyncWork();
});
```

