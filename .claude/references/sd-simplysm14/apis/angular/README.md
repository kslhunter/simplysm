# @simplysm/angular

Angular 기반 클라이언트 앱 프레임워크 — 부트스트랩 프로바이더, UI 컨트롤·레이아웃, CRUD·시트·공유데이터·칸반·시각화 컴포넌트, 모달·토스트·busy 오버레이, 라우팅·권한·설정 인프라를 제공. `import "@simplysm/core-browser"` 를 side-effect 로 로드하며, 모든 컴포넌트는 `standalone: true` + `OnPush` + `ViewEncapsulation.None`, selector 는 `sd-` prefix.

## 사용 트리거 인덱스

- **provideSdAngular** — 앱 부트스트랩 시 1회. 테마 영속화·전역 에러 핸들러·zoneless·SW 업데이트 폴링·라우팅 busy 추적을 일괄 설정. (이 README 의 `앱 부트스트랩` 참조)
- **UI 컨트롤** (`sd-button`·`sd-textfield`·`sd-select`·`sd-checkbox`·`sd-tab`·`sd-list`·`sd-form`·`sd-dropdown` 등) — 폼·입력·버튼·선택 화면을 구성할 때. 자세히: [controls.md](./controls.md)
- **시트** (`sd-sheet`·`sd-sheet-column`·시트 설정 모달·시트 타입) — 다건 목록·편집 그리드. 자세히: [sheet.md](./sheet.md)
- **CRUD 골격** (`sd-crud-list`·`sd-crud-detail`·`sd-base-container`·`SdStatePreset`·`SdPermissionTable`) — 목록·단건 편집 화면 표준 셸, 상태 프리셋, 권한 테이블. 자세히: [crud.md](./crud.md)
- **오버레이** (`SdModalProvider`·`SdToastProvider`·`SdBusyProvider`·`SdPrintProvider`·`SdFileDialogProvider`·`SdModal`·`SdPromptModal`·`SdConfirmModal`) — 모달 띄우기·토스트·busy·프린트·파일 다이얼로그. 자세히: [overlay.md](./overlay.md)
- **공유 마스터 데이터** (`SdSharedDataProvider`·`sd-shared-data-select*`·`use*Manager`·`matchesSearchText`) — 마스터 데이터 공유·선택 컨트롤·선택/정렬/펼침 매니저. 자세히: [shared-data.md](./shared-data.md)
- **라우팅·앱구조·권한** (`SdRouterLink`·`injectViewTypeSignal`·`injectPermsSignal`·`SdAppStructureProvider`·`injectViewTitleSignal`·`setupCanDeactivate`·`getMenuRouterLinkOption`) — 메뉴·권한·라우팅 좌표·이탈 가드. 자세히: [routing-appstructure.md](./routing-appstructure.md)
- **디렉티브·이펙트** (`SdEvents`·`SdCommandDirective`·`SdResizeDirective`·`SdIntersectionDirective`·`SdRipple`·`SdShowEffect`·`SdInvalid`·`SdTypedTemplate`·`SdItemOfTemplate`) — DOM 이벤트 옵션·단축키·리사이즈·리플·검증·타입 템플릿. 자세히: [directives.md](./directives.md)
- **레이아웃** (`sd-sidebar*`·`sd-topbar*`) — 사이드바·탑바 셸. 자세히: [layout.md](./layout.md)
- **칸반** (`sd-kanban-board`·`sd-kanban-lane`·`sd-kanban`) — 드래그앤드롭 칸반 보드. 자세히: [kanban.md](./kanban.md)
- **features** (`SdThemeProvider`·`SdThemeSelector`·`SdTiptapEditor`·`SdAddressSearchModal`·`sd-label`·`sd-note`·`sd-progress`·`sd-calendar`·`sd-barcode`·`sd-echarts`) — 테마·에디터·주소검색·시각요소. 자세히: [features.md](./features.md)
- **설정·로그·서비스 인프라** (`SdLocalStorageProvider`·`SdSystemConfigProvider`·`SdSystemLogProvider`·`SdServiceClientFactoryProvider`·`injectSdSystemConfigResource`·`SdAngularConfigProvider`) — 이 README 의 `설정·로그·서비스 인프라` 인라인 섹션.
- **코어 유틸** (`mark`·`FormatPipe`·`setSafeStyle`·`setupBgTheme`·`setupModelHook`·타입 헬퍼) — 이 README 의 `코어 유틸` 인라인 섹션.

## 앱 부트스트랩

### `provideSdAngular`

```ts
function provideSdAngular(opt: { clientName: string }): EnvironmentProviders
```

- 부트스트랩 `providers` 에 1회 추가. `opt.clientName` — `SdAngularConfigProvider.clientName` 으로 설정되며 `SdLocalStorageProvider` 가 키 네임스페이스(`${clientName}.${key}`)로 사용.
- 설정하는 것: 테마 dark/fontSize 의 `SdLocalStorageProvider` 영속화(브라우저 전용), 전역 `window` error/unhandledrejection → `ErrorHandler` 라우팅, `SdAngularConfigProvider`, `SdOptionEventPlugin`(`EVENT_MANAGER_PLUGINS` multi), `SdGlobalErrorHandlerPlugin`(`ErrorHandler`), `provideZonelessChangeDetection()`, 서비스워커 업데이트 폴러(지수 백오프 5분→60분, 갱신 시 새로고침 확인), 라우팅 navigation busy 추적(`SdBusyProvider.globalBusyCount`).

```ts
bootstrapApplication(AppRoot, {
  providers: [provideSdAngular({ clientName: "admin" }), /* ... */],
});
```

## 코어 유틸

### `mark`

```ts
function mark(sig: WritableSignal<any>): void
```

- 시그널 값을 얕은 복사(배열이면 `[...v]`, 객체면 `{ ...v }`)로 교체해 **새 참조**로 만들어 변경 알림만 발행. 값 자체는 동일. effect 강제 재발화·객체 시그널 내부 필드 변경 통지에 사용.

```ts
<sd-textfield [(value)]="filter().name" (valueChange)="mark(filter)" />
doRefresh(): void { mark(this.lastFilter); }
```

### `FormatPipe`

standalone pipe, `name: "format"`. `transform(value: string | DateTime | DateOnly | undefined, format: string): string`.

- `value == null` → `""`.
- `DateTime`/`DateOnly` → `value.toFormatString(format)`.
- `string` → `format` 을 `|` 로 분리한 마스크 중 `X` 개수가 `value.length` 와 같은 첫 마스크 사용. `X` 는 좌→우로 값 문자로 치환, 비-`X` 문자는 리터럴 삽입. 일치 마스크 없으면 원본 반환. (예: `"XXX-XXXX"` 가 7자 문자열을 포맷)

### `setSafeStyle`

```ts
function setSafeStyle(renderer: Renderer2, el: HTMLElement, style: Partial<CSSStyleDeclaration>): void
```

- `style` 의 각 키를 `renderer.setStyle` 로 적용. 동적 스타일을 Renderer2 경유로 적용할 때.

### `setupBgTheme`

```ts
function setupBgTheme(options?: {
  theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray";
  lightness?: "lightest" | "lighter";  // 기본 "lightest"
}): void
```

- 주입 컨텍스트에서 호출. `effect` 안에서 body `--background-color` 를 `var(--theme-{theme}-{lightness})` 로 설정, 정리 시 복원. SSR no-op. 화면별 배경 테마 색 지정에.

### `setupModelHook`

```ts
function setupModelHook<T, S extends WritableSignal<T>>(
  model: S, canFn: Signal<(item: T) => boolean | Promise<boolean>>,
): void
```

- model 시그널의 `set`/`update` 를 래핑해 쓰기 전에 `canFn()(value)` 가드 통과를 강제. `false` 면 쓰기 스킵, `true` 면 진행, Promise 면 resolve 값이 명시적 `false` 일 때만 차단. reject 는 `ErrorHandler` 로 라우팅. 주입 컨텍스트 필요. `SdCheckbox`/`SdSwitch`/`SdSharedDataSelectList` 의 `canChangeFn` 내부 기반.

### 타입 헬퍼 (`directive-input-signals.ts`)

- `DirectiveInputSignals<T>` — 컴포넌트/디렉티브 `T` 의 모든 `InputSignal<V>` 프로퍼티를 `{ prop: V }` 평면 객체로 추출(비-input 프로퍼티 제거), `undefined` 포함 필드는 optional 화. 모달/프린트 `inputs` 타입의 기반.
- `UndefToOptional<T>` — 값 타입에 `undefined` 가 포함된 프로퍼티를 optional(`?`)로 바꾸고 값에서 `undefined` 제거.
- `WithOptional<T, K extends keyof T>` = `Omit<T, K> & Partial<Pick<T, K>>` — 키 `K` 들을 optional 로.
- `SelectModalOutputResult<TKey = any>` — `{ selectedKeys: TKey[] }`. 선택 모달의 close 페이로드 표준 형태.

## 설정·로그·서비스 인프라

### `SdAngularConfigProvider`

`@Injectable({ providedIn: "root" })`. 필드 `clientName: string` — `provideSdAngular` 가 주입한 클라이언트 이름.

### `SdLocalStorageProvider<T>`

`@Injectable({ providedIn: "root" })`. 키는 `${clientName}.${key}` 로 네임스페이스. SSR 가드(`set`/`remove` no-op, `get` → `undefined`).

- `set<K extends keyof T & string>(key: K, value: T[K]): void` — JSON 직렬화 저장.
- `get<K extends keyof T & string>(key: K): T[K] | undefined` — JSON 파싱; 없거나 파싱 실패 시 `undefined`.
- `remove(key: keyof T & string): void`.

### `SdSystemConfigProvider<T>`

`@Injectable({ providedIn: "root" })`. 원격 `fn` 미지정 시 `SdLocalStorageProvider` 위임.

- `fn?: { set(key, data): Promise<void>|void; get(key): PromiseLike<unknown> }` — 원격 저장소 연동 함수. 설정 시 로컬 대신 사용.
- `setAsync<K extends keyof T & string>(key: K, data: T[K] | undefined): Promise<void>` — `fn.set` 있으면 사용; 없으면 `data == null` 이면 로컬 remove, 아니면 저장.
- `getAsync(key: keyof T & string): Promise<...>` — `fn.get` 있으면 사용; 없으면 로컬 read.

### `injectSdSystemConfigResource<T>`

```ts
function injectSdSystemConfigResource<T>(options: { key: Signal<string | undefined> }): {
  value: Signal<T | undefined>; isLoading: Signal<boolean>; status: Signal<ResourceStatus>;
  hasValue: () => boolean; reload: () => boolean;
  set: (value: T | undefined) => void; update: (fn: (prev: T | undefined) => T | undefined) => void;
}
```

- 주입 컨텍스트에서 호출. 호스트 엘리먼트 태그 + `key()` 를 합친 키(`${elTag}.${key}`)로 `SdSystemConfigProvider.getAsync` 를 로드하는 `resource` 반환. `set` 은 값을 동기 갱신 후 microtask 로 `setAsync` 영속화(키 `undefined` 면 스킵). 시트가 사용자별 컬럼 설정을 저장하는 데 사용.

### `SdSystemLogProvider`

`@Injectable({ providedIn: "root" })`.

- `writeFn?: (severity: "error" | "warn" | "log", ...data: any[]) => Promise<void> | void` — 외부 싱크(DB 등). 설정 시 `writeAsync` 가 추가로 호출. (클라이언트 시스템 로그 적재 컨벤션은 client-system-log.md)
- `writeAsync(severity: "error" | "warn" | "log", ...data: any[]): Promise<void>` — 내부 로거에 기록 후, `writeFn` 있으면 await(에러는 삼키고 로깅). `SdToastProvider.try` / `SdGlobalErrorHandlerPlugin` 가 에러를 여기에 적재.

### `SdServiceClientFactoryProvider`

`@Injectable({ providedIn: "root" })`. 키 기반 `ServiceClient` 풀 관리. (Provider 정의·서비스 호출 컨벤션은 client-service.md)

- `connectAsync(key: string, options?: Partial<ServiceConnectionOptions>): Promise<void>` — `location` 기반 기본 옵션(host/port/ssl)에 `options` 머지해 클라이언트 생성·연결, `key` 로 저장. 이미 닫혔거나 연결된 키면 throw. request/response-progress 이벤트를 progress 토스트로 자동 배선.
- `closeAsync(key: string): Promise<void>` — 닫고 맵에서 제거, 키를 닫힘으로 표시. 연결 안 된 키면 throw.
- `get(key: string): ServiceClient` — 연결된 클라이언트 반환. 닫힌 키/미연결 키면 throw.
