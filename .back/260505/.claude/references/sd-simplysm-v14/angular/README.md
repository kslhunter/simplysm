# @simplysm/angular

> Angular 21 기반 UI 컴포넌트 라이브러리. Zoneless, signal-based, standalone 컴포넌트로 구성된다.
> `@simplysm/core-common`, `@simplysm/core-browser`, `@simplysm/service-client` 의존.

> **NOTE:** 이 문서는 `@simplysm/angular` 라이브러리의 사용법만 다룬다. Angular 프레임워크 자체의 사용법(컴포넌트 작성, DI, 라우팅, signal 등)은 `angular-cli` MCP를 활용한다.

## Installation

```bash
npm install @simplysm/angular
```

## 먼저 읽기 (횡단 전제)

- [provideSdAngular](./bootstrap/provide-sd-angular.md) — 반드시 등록해야 하는 환경 프로바이더

## 하려는 작업 → 읽을 파일

### 시작하기

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 앱 부트스트랩 (provideSdAngular 등록) | [provide-sd-angular.md](./bootstrap/provide-sd-angular.md) |
| clientName 설정 조회 | [sd-angular-config-provider.md](./bootstrap/sd-angular-config-provider.md) |

### 사용자 입력 받기

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 텍스트/숫자/날짜/색상 등 한 줄 입력 | [sd-textfield.md](./ui-form/sd-textfield.md) |
| 여러 줄 텍스트 입력 | [sd-textarea.md](./ui-form/sd-textarea.md) |
| 리치 텍스트 (HTML) 편집 | [sd-tiptap-editor.md](./features/sd-tiptap-editor.md) |
| 숫자 패드 입력 (터치 기기) | [sd-numpad.md](./ui-form/sd-numpad.md) |
| 범위 입력 (from ~ to) | [sd-range.md](./ui-form/sd-range.md) |
| 날짜 범위 선택 (일/월/범위 모드) | [sd-date-range-picker.md](./ui-form/sd-date-range-picker.md) |
| 드롭다운으로 항목 선택 (single/multi) | [sd-select.md](./ui-form/sd-select.md) |
| 공유 데이터에서 드롭다운 선택 | [sd-shared-data-select.md](./ui-form/sd-shared-data-select.md) |
| 모달을 열어 항목 선택 | [sd-modal-select-button.md](./ui-form/sd-modal-select-button.md) |
| 공유 데이터를 모달에서 선택 | [sd-shared-data-components.md](./features/sd-shared-data-components.md) |
| 체크박스 토글 | [sd-checkbox.md](./ui-form/sd-checkbox.md) |
| 스위치 토글 | [sd-switch.md](./ui-form/sd-switch.md) |
| 체크박스 그룹 (다중 선택) | [sd-checkbox-group.md](./ui-form/sd-checkbox-group.md) |
| 버튼 스타일 선택 | [sd-select.md](./ui-form/sd-select.md) (SdSelectButton) |
| 폼 제출 (submit 이벤트, 유효성) | [sd-form.md](./ui-form/sd-form.md) |
| 상태 프리셋 저장/불러오기 | [sd-state-preset.md](./ui-form/sd-state-preset.md) |

### 데이터 표시하기

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 스프레드시트 형태 데이터 표시 (정렬, 고정, 리사이즈) | [sd-sheet.md](./ui-data/sd-sheet.md) |
| 리스트 형태 데이터 표시 | [sd-list.md](./ui-data/sd-list.md) |
| 캘린더에 항목 배치 | [sd-calendar.md](./ui-visual/sd-calendar.md) |
| 차트 (ECharts) 표시 | [sd-echarts.md](./ui-visual/sd-echarts.md) |
| 바코드 생성 | [sd-barcode.md](./ui-visual/sd-barcode.md) |
| 라벨 (테마 색상) 표시 | [sd-label.md](./ui-visual/sd-label.md) |
| 노트/알림 메시지 박스 표시 | [sd-note.md](./ui-visual/sd-note.md) |
| 진행률 바 표시 | [sd-progress.md](./ui-visual/sd-progress.md) |

### CRUD 스캐폴드

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| CRUD 페이지/모달의 기본 컨테이너 (busy, restricted, viewType별 레이아웃) | [sd-base-container.md](./ui-data/sd-base-container.md) |
| CRUD 상세 화면 (폼 + 저장) | [sd-crud-detail.md](./ui-data/sd-crud-detail.md) |
| CRUD 목록 화면 (시트 + 필터 + 등록/삭제/복구) | [sd-crud-list.md](./ui-data/sd-crud-list.md) |

### 모달/알림/피드백

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 코드에서 모달을 프로그래밍 방식으로 열기 | [sd-modal-provider.md](./providers/sd-modal-provider.md) |
| 모달 컴포넌트 구현 (SdModalContentDef) | [sd-modal-content-def.md](./provider-types/sd-modal-content-def.md) |
| 확인/취소 대화상자 | [sd-confirm-modal.md](./ui-overlay/sd-confirm-modal.md) |
| 텍스트 입력 대화상자 | [sd-prompt-modal.md](./ui-overlay/sd-prompt-modal.md) |
| 모달 내부에서 모달/컨텐츠 참조 | [sd-activated-modal-provider.md](./providers/sd-activated-modal-provider.md) |
| 토스트 알림 표시 (info/success/warning/danger) | [sd-toast-provider.md](./providers/sd-toast-provider.md) |
| busy 로딩 표시 (spinner/bar/cube) | [sd-busy-provider.md](./providers/sd-busy-provider.md) |
| 인쇄 또는 PDF 생성 | [sd-print-provider.md](./providers/sd-print-provider.md) |
| 네이티브 파일 선택 대화상자 | [sd-file-dialog-provider.md](./providers/sd-file-dialog-provider.md) |

### 레이아웃/내비게이션

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 도킹 레이아웃 (top/bottom/left/right 고정 영역) | [sd-dock-container.md](./ui-layout/sd-dock-container.md) |
| 사이드바 + 메뉴 구성 | [sd-sidebar-container.md](./ui-navigation/sd-sidebar-container.md) |
| 사이드바 메뉴 항목 | [sd-sidebar-menu.md](./ui-navigation/sd-sidebar-menu.md) |
| 사이드바 사용자 영역 | [sd-sidebar-user.md](./ui-navigation/sd-sidebar-user.md) |
| 탑바 구성 | [sd-topbar-container.md](./ui-navigation/sd-topbar-container.md) |
| 탑바 메뉴/사용자 영역 | [sd-topbar-menu.md](./ui-navigation/sd-topbar-menu.md), [sd-topbar-user.md](./ui-navigation/sd-topbar-user.md) |
| 탭 전환 | [sd-tab.md](./ui-navigation/sd-tab.md) |
| 접기/펼치기 패널 | [sd-collapse.md](./ui-navigation/sd-collapse.md) |
| 페이지네이션 | [sd-pagination.md](./ui-navigation/sd-pagination.md) |
| 간격 (gap) 삽입 | [sd-gap.md](./ui-layout/sd-gap.md) |
| 칸반 보드 (드래그앤드롭) | [sd-kanban-board.md](./ui-layout/sd-kanban-board.md) |
| 드롭다운 팝업 | [sd-dropdown.md](./ui-overlay/sd-dropdown.md) |
| 버튼/앵커 클릭 | [sd-button.md](./ui-form/sd-button.md) |
| 추가 동작 버튼 (콘텐츠 + 버튼 영역) | [sd-additional-button.md](./ui-form/sd-additional-button.md) |

### 스타일/테마

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 다크모드/폰트 크기 전환 | [sd-theme-provider.md](./providers/sd-theme-provider.md) |
| 레이아웃/유틸리티 CSS 클래스 | [classes.md](./styling/classes.md) |
| CSS 변수 (색상, 간격, 폰트) 오버라이드 | [variables.md](./styling/variables.md) |
| 다크 모드 테마 | [themes.md](./styling/themes.md) |
| SCSS mixin/function 사용 | [mixins.md](./styling/mixins.md) |

### 인프라/유틸리티

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 시스템 설정 비동기 저장/조회 | [sd-system-config-provider.md](./providers/sd-system-config-provider.md) |
| 시스템 설정 resource 래퍼 | [inject-sd-system-config-resource.md](./utils/inject-sd-system-config-resource.md) |
| 시스템 로그 기록 | [sd-system-log-provider.md](./providers/sd-system-log-provider.md) |
| 앱 구조 (메뉴/권한) 관리 | [sd-app-structure-provider.md](./providers/sd-app-structure-provider.md) |
| 공유 데이터 캐시 (이벤트 기반) | [sd-shared-data-provider.md](./providers/sd-shared-data-provider.md) |
| ServiceClient 팩토리 | [sd-service-client-factory-provider.md](./providers/sd-service-client-factory-provider.md) |
| localStorage 래퍼 (clientName 스코프) | [sd-local-storage-provider.md](./providers/sd-local-storage-provider.md) |
| 새 윈도우 네비게이션 | [sd-navigate-window-provider.md](./providers/sd-navigate-window-provider.md) |
| 권한 매트릭스 테이블 표시 | [sd-permission-table.md](./features/sd-permission-table.md) |
| 주소 검색 (Daum Postcode) | [sd-address-search-modal.md](./features/sd-address-search-modal.md) |
| 선택 관리 (single/multi/expanding/sorting) | [selection-managers.md](./utils/selection-managers.md) |
| 라우팅 signal (현재 페이지 코드, 뷰 타입) | [inject-routing-signals.md](./utils/inject-routing-signals.md) |
| setup 함수 (리플, 유효성, canDeactivate 등) | [setup-functions.md](./utils/setup-functions.md) |
| WritableSignal 변경 알림 트리거 | [mark.md](./utils/mark.md) |
| CSS 스타일 일괄 적용 (Renderer2) | [set-safe-style.md](./utils/set-safe-style.md) |
| 포매팅 파이프 (DateTime 등) | [format-pipe.md](./pipes/format-pipe.md) |
| 타입 유틸리티 (DirectiveInputSignals 등) | [directive-input-signals.md](./type-utilities/directive-input-signals.md) |

### 디렉티브

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 리플 효과 적용 | [sd-ripple.md](./directives/sd-ripple.md) |
| 뷰포트 진입 시 reveal 애니메이션 | [sd-show-effect.md](./directives/sd-show-effect.md) |
| 유효성 검증 표시 | [sd-invalid.md](./directives/sd-invalid.md) |
| 템플릿 컨텍스트 타입 가드 | [sd-typed-template.md](./directives/sd-typed-template.md) |
| 라우터 네비게이션 (Ctrl+클릭 새 창) | [sd-router-link.md](./directives/sd-router-link.md) |
| 키보드 단축키 (Ctrl+S 저장 등) | [sd-command-directive.md](./directives/sd-command-directive.md) |
| ResizeObserver 이벤트 | [sd-resize-directive.md](./directives/sd-resize-directive.md) |
| IntersectionObserver 이벤트 | [sd-intersection-directive.md](./directives/sd-intersection-directive.md) |
| 이벤트 수식어 (.capture/.passive/.once) | [sd-events.md](./directives/sd-events.md) |

### 플러그인

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 이벤트 옵션 플러그인 (.capture 등) | [sd-option-event-plugin.md](./plugins/sd-option-event-plugin.md) |
| 글로벌 에러 핸들러 | [sd-global-error-handler.md](./plugins/sd-global-error-handler.md) |

## 이 패키지를 쓰지 말아야 할 때

- 서버 사이드 로직 → `@simplysm/service-server`
- Node.js 파일/프로세스 유틸리티 → `@simplysm/core-node`
- ORM/DB 쿼리 → `@simplysm/orm-node`, `@simplysm/orm-common`

## 컴포넌트 비동기 초기화 규칙

컴포넌트에서 비동기 초기화가 필요한 경우 constructor `effect()` + `void untracked(async () => ...)` 패턴을 사용한다. signal 의존성을 `effect` 콜백의 동기 부분에서 읽어 등록하고, 비동기 작업은 `untracked` 안에서 수행한다. 의존 signal이 변경되면 effect가 자동 재실행된다.

```typescript
export class SomePage {
  busyCount = signal(0);
  initialized = signal(false);

  constructor() {
    effect(() => {
      // signal 의존성 등록 (untracked 바깥)
      this.someInput();
      this.lastFilter();

      void untracked(async () => {
        this.busyCount.update((v) => v + 1);
        await this._sdToast.try(async () => {
          // 비동기 초기화 로직
        });
        this.busyCount.update((v) => v - 1);
        this.initialized.set(true);
      });
    });
  }
}
```

- constructor 내 `void (async () => { ... })()` IIFE 패턴 **금지**
- constructor 내 `void this._init()` 같은 수동 호출 패턴 **금지** — effect가 이미 같은 역할
- `async ngOnInit()` 패턴 **금지** — 1회만 실행되어 input signal 변경에 반응하지 않는다. effect는 의존 signal 변경 시 자동 재실행된다
- `resource()` / `httpResource()`는 데이터 로딩 → signal 매핑 용도. 사이드이펙트(라우팅, toast 등) 포함 초기화에는 사용하지 않는다

## 소비 프로젝트 네이밍 규칙

`@simplysm/angular`를 소비하는 앱 프로젝트에서의 파일명·클래스명·selector 규칙이다.
파일명은 **kebab-case + dot-suffix**, 클래스명은 **PascalCase**를 따른다.

| 접미어 | 조건 | 파일명 예시 | 클래스명 예시 | selector 예시 |
|--------|------|-------------|---------------|---------------|
| `.list.ts` / `*List` | 여러 레코드를 조회·관리하는 화면 | `outbound-instruction.list.ts` | `OutboundInstructionList` | `app-outbound-instruction-list` |
| `.detail.ts` / `*Detail` | 단일 레코드를 조회·편집하는 화면 | `outbound-instruction.detail.ts` | `OutboundInstructionDetail` | `app-outbound-instruction-detail` |
| `.view.ts` / `*View` | list/detail 아닌 route 연결 화면 (대시보드, 설정 등) | `dashboard.view.ts` | `DashboardView` | `app-dashboard-view` |
| `.modal.ts` / `*Modal` | 모달 전용 컴포넌트 (route 없이 `SdModalProvider.showAsync`로만 열림) | `item-select.modal.ts` | `ItemSelectModal` | `app-item-select-modal` |
| `.print-template.ts` / `*PrintTemplate` | 인쇄 전용 컴포넌트 (`SdPrintProvider`로 호출, `SdPrint` 구현) | `box-label.print-template.ts` | `BoxLabelPrintTemplate` | `app-box-label-print-template` |
| `.provider.ts` / `*Provider` | `@Injectable` 클래스 (**`*Service` 금지**) | `app-service.provider.ts` | `AppServiceProvider` | — |
| 접미어 없음 | route 미연결 일반 컨트롤 컴포넌트 | `instruction-item.ts` | `InstructionItem` | `app-instruction-item` |

- `pipe`, `directive` 등 기타 Angular 구성요소는 `@simplysm/angular` 패키지 자체의 네이밍 패턴(`.pipe.ts`, `.directive.ts`)을 따른다
- route 화면이 모달로도 재사용되는 경우(예: 선택 모달 겸용 리스트) **주 용도(route)의 suffix**를 유지한다 (예: `CustomerList` + `implements SdSelectModal`)

### selector 규칙

selector는 `app-{도메인}-{suffix}` 형식이다. 같은 도메인에 list와 detail이 공존할 수 있으므로 suffix를 반드시 포함한다.

| 클래스명 | selector |
|----------|----------|
| `CustomerList` | `app-customer-list` |
| `CustomerDetail` | `app-customer-detail` |
| `DashboardView` | `app-dashboard-view` |
| `ItemSelectModal` | `app-item-select-modal` |

### interface 네이밍

소비앱 내부의 로컬 interface에는 **`I` prefix**를 사용한다. 라이브러리에서 import하는 타입(`SortingDef`, `SharedDataBase` 등)에는 붙이지 않는다.

```typescript
// 소비앱 로컬 interface — I prefix 사용
interface IFilter { searchText?: string; }
interface ICustomer { id: number; name: string; }

// 라이브러리 타입 — 그대로 사용
import type { SortingDef, SharedDataBase } from "@simplysm/angular";
```

## inject 네이밍 컨벤션

`Sd*Provider`를 `inject()`할 때 변수명은 다음 규칙을 따른다:

- **Sd 접두어 유지**: 클래스명에서 `Sd`를 camelCase로 변환하여 유지한다
- **Provider 접미어 제거**: 변수명에서 `Provider`를 제거한다

| inject 대상 | 클래스 필드 | 로컬 변수 |
|-------------|-----------|----------|
| `SdToastProvider` | `private _sdToast = inject(SdToastProvider)` | `const sdToast = inject(SdToastProvider)` |
| `SdModalProvider` | `private _sdModal = inject(SdModalProvider)` | `const sdModal = inject(SdModalProvider)` |
| `SdServiceClientFactoryProvider` | `private _sdServiceClientFactory = inject(SdServiceClientFactoryProvider)` | `const sdServiceClientFactory = inject(...)` |

## 소비 프로젝트 디렉토리 구조

```
src/
├── app/                                  # 라우팅 페이지 (사이드바 메뉴 트리 구조와 대응)
│   ├── login/
│   └── home/
│       ├── {메뉴-그룹}/                  # 사이드바 메뉴 그룹
│       │   └── {도메인}/                 # 개별 도메인 (트리 깊이 제한 없음)
│       │       ├── {도메인}.view.ts      # route 연결 병합 컴포넌트
│       │       ├── {도메인}.list.ts      # 여러 레코드 조회·관리
│       │       ├── {도메인}.detail.ts    # 단일 레코드 조회·편집
│       │       ├── {이름}.modal.ts       # 도메인 전용 모달
│       │       └── {이름}.ts            # 일반 컨트롤 (route 미연결)
│       └── main/
├── controls/                             # 앱 공유 컨트롤 컴포넌트
├── directives/                           # 앱 공유 디렉티브
├── modals/                               # 앱 전역 공통 모달
├── providers/                            # 앱 전역 프로바이더
├── types/                                # 타입 정의
└── utils/                                # 유틸리티
```

- `app/` 하위 트리는 사이드바 메뉴 구조와 거의 대응된다
- **배치 기준은 "어느 도메인에 소속되는가"**이다. provider, modal, directive, print-template, util 등 모든 종류의 파일이 소속 도메인 폴더 안에 배치된다 (다른 도메인에서 import하여 사용하는 것은 자유)
- 특정 도메인에 소속되지 않는 공통 파일만 `src/` 직하의 `controls/`, `modals/`, `providers/` 등에 배치한다

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

---

> API 이름으로 검색: [_api-index.md](./_api-index.md)
