# @simplysm/angular

Angular 클라이언트 앱의 부트스트랩, UI 컨트롤, 화면 골격, 오버레이, 시트/공유데이터, 라우팅·권한·설정 인프라를 제공한다.

## 사용 트리거 인덱스

- **provideSdAngular** — 앱 부트스트랩에서 `@simplysm/angular` 전역 provider 묶음을 한 번 등록할 때.
- **코어 유틸·타입 헬퍼** — signal 변경 통지, 값 포맷 pipe, Renderer2 스타일 적용, 모델 변경 가드, modal/print 입력 타입 추출을 다룰 때.
- **설정·로그·서비스 인프라** — clientName, localStorage/system config, system log, service-client 연결, 전역 에러 처리를 배선할 때. 사용법: [client-service.md](../../manuals/client-service.md), [client-system-log.md](../../manuals/client-system-log.md), [client-system-config.md](../../manuals/client-system-config.md)
- **디렉티브·이펙트** — DOM 이벤트 옵션, 리사이즈/교차 관찰, CTRL 단축키, ripple/show/invalid 효과, typed template을 붙일 때. 자세히: [directives.md](./directives.md)
- **폼·입력 컨트롤** — 버튼, 텍스트/날짜/숫자 입력, checkbox/switch, select/dropdown, form, collapse, tab, list, gap, pagination을 조립할 때. 자세히: [controls.md](./controls.md)
- **오버레이·인쇄·파일** — modal, toast, busy overlay, file dialog, browser print/PDF 출력을 호출할 때. 자세히: [overlay.md](./overlay.md)
- **라우팅·앱구조·권한** — sdRouterLink, 현재 page code/title/type, canDeactivate, menu/permission tree를 다룰 때. 자세히: [routing-appstructure.md](./routing-appstructure.md)
- **레이아웃** — sidebar/topbar shell과 메뉴·사용자 메뉴를 구성할 때. 자세히: [layout.md](./layout.md)
- **시트** — `sd-sheet` 기반 목록/편집 표, 컬럼, 셀 템플릿, 컬럼 설정 저장을 다룰 때. 자세히: [sheet.md](./sheet.md)
- **공유 마스터 데이터·선택 매니저** — shared-data provider, shared-data 선택 UI, selection/sorting/expanding manager를 쓸 때. 자세히: [shared-data.md](./shared-data.md)
- **칸반** — lane/card drag-drop 보드와 카드 다중 선택을 만들 때. 자세히: [kanban.md](./kanban.md)
- **CRUD 골격·권한표·상태 프리셋** — `sd-crud-list`/`sd-crud-detail`, base container, permission table, state preset을 쓸 때. 자세히: [crud.md](./crud.md)
- **테마·주소·에디터·시각화** — theme selector/provider, 주소검색 modal, TipTap/Markdown editor, label/note/progress/calendar/barcode/ECharts를 붙일 때. 자세히: [features.md](./features.md)

## 앱 부트스트랩

### `provideSdAngular`

```ts
function provideSdAngular(opt: { clientName: string }): EnvironmentProviders
```

- `opt.clientName: string` — `SdAngularConfigProvider.clientName` 에 저장되는 클라이언트 이름. `SdLocalStorageProvider` 키 prefix(`${clientName}.${key}`)와 service-client 생성에 쓰인다.
- 제공 항목 — `IMAGE_CONFIG` 경고 비활성, `NgIcons` 기본 stroke/size, theme localStorage 복원·저장, browser `error`/`unhandledrejection` → `ErrorHandler`, `SdAngularConfigProvider`, `SdOptionEventPlugin`, `SdGlobalErrorHandlerPlugin`, zoneless change detection, service-worker update polling, Router navigation busy count 추적.
- browser guard — theme 저장·전역 window listener·service-worker update·busy overlay 관련 처리는 `isPlatformBrowser` 조건에서만 수행한다.

## 코어 유틸·타입 헬퍼

### `setupBgTheme`

```ts
function setupBgTheme(options?: {
  theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray";
  lightness?: "lightest" | "lighter";
}): void
```

- `theme` — body CSS 변수 `--background-color` 를 `var(--theme-{theme}-{lightness})` 로 바꿀 테마 이름. 없으면 빈 값으로 되돌린다.
- `lightness` — 테마 색 단계. `"lightest"` 는 기본값, `"lighter"` 는 더 진한 단계 변수명을 만든다.
- 동작 — browser에서만 `effect` 로 적용하고 cleanup 때 `--background-color` 를 빈 값으로 되돌린다.

### `setSafeStyle`

```ts
function setSafeStyle(renderer: Renderer2, el: HTMLElement, style: Partial<CSSStyleDeclaration>): void
```

- `renderer` — 각 style 값을 `renderer.setStyle` 로 적용하는 Angular renderer.
- `el` — style을 적용할 HTML 요소.
- `style` — `CSSStyleDeclaration` 키별 값 객체. 객체의 own key를 순회해 그대로 설정한다.

### `setupModelHook`

```ts
function setupModelHook<T>(
  model: WritableSignal<T>,
  canFn: Signal<(item: T) => boolean | Promise<boolean>>,
): void
```

- `model` — `set`/`update` 가 래핑될 writable signal.
- `canFn` — 새 값 수락 여부를 판단하는 signal 함수. `false` 는 변경 차단, `true` 는 즉시 반영, Promise는 resolve 값이 `false` 일 때만 차단한다.
- 오류 처리 — Promise reject는 주입한 `ErrorHandler.handleError` 로 전달한다.

### `mark`

```ts
function mark<T extends object | undefined>(sig: WritableSignal<T>): void
```

- `sig` — in-place mutation 뒤 새 참조로 통지할 object/array signal.
- 동작 — 값이 배열이면 shallow array copy, 객체면 shallow object copy로 `sig.update`; `null`/`undefined` 는 그대로 둔다.

### `FormatPipe`

```ts
class FormatPipe implements PipeTransform {
  transform(value: string | DateTime | DateOnly | undefined, format: string): string;
}
```

- `value` — `undefined`/`null` 은 빈 문자열, `DateTime`/`DateOnly` 는 `toFormatString(format)`, 문자열은 `X` 마스크 치환 대상.
- `format` — 문자열일 때 `|` 로 나뉜 후보 마스크. `X` 개수가 문자열 길이와 같은 첫 후보에서 `X` 위치만 값 문자로 치환한다.

### 선택 모달·입력 타입 헬퍼

```ts
interface SelectModalOutputResult<TKey = any> { selectedKeys: TKey[] }
type UndefToOptional<T> = ...
type DirectiveInputSignals<T> = ...
type WithOptional<T, K extends keyof T> = ...
```

- `SelectModalOutputResult.selectedKeys: TKey[]` — 선택 모달 close payload의 선택 key 배열.
- `UndefToOptional<T>` — 값 타입에 `undefined` 가 포함된 property를 optional property로 바꾸고 값 타입에서 `undefined` 를 제외한다.
- `DirectiveInputSignals<T>` — `T` 의 `InputSignal<V>` property만 골라 `{ property: V }` 객체 타입으로 만들고 `undefined` 포함 필드는 optional 처리한다.
- `WithOptional<T, K>` — `T` 에서 `K` key만 optional로 바꾼다.

## 설정·로그·서비스 인프라

### `SdAngularConfigProvider`

```ts
class SdAngularConfigProvider { clientName: string }
```

- `clientName` — `provideSdAngular({ clientName })` 가 설정하는 앱 식별자. localStorage key prefix와 service-client 생성 인자에 쓰인다.

### `SdLocalStorageProvider<T>`

```ts
class SdLocalStorageProvider<T> {
  set<K extends keyof T & string>(key: K, value: T[K]): void;
  get<K extends keyof T & string>(key: K): T[K] | undefined;
  remove(key: keyof T & string): void;
}
```

- `key` — `${SdAngularConfigProvider.clientName}.${key}` 로 localStorage에 저장되는 문자열 key.
- `value` — `JSON.stringify` 로 저장되는 값.
- `get` 동작 — browser가 아니거나 항목이 없거나 JSON parse 실패면 `undefined` 를 반환한다.
- `set`/`remove` 동작 — browser가 아니면 아무 작업도 하지 않는다.

### `SdSystemConfigProvider<T>`

사용법: [client-system-config.md](../../manuals/client-system-config.md)

```ts
class SdSystemConfigProvider<T> {
  fn?: {
    set<K extends keyof T & string>(key: K, data: T[K] | undefined): Promise<void> | void;
    get(key: keyof T & string): PromiseLike<unknown>;
  };
  setAsync<K extends keyof T & string>(key: K, data: T[K] | undefined): Promise<void>;
  getAsync<K extends keyof T & string>(key: K): Promise<T[K] | undefined>;
}
```

- `fn` — 원격/외부 설정 저장소 hook. 있으면 `setAsync`/`getAsync` 가 localStorage 대신 이 hook을 호출한다.
- `fn.set` — key와 값 또는 `undefined` 를 저장한다.
- `fn.get` — key에 해당하는 값을 반환한다.
- `setAsync` — `fn` 이 없고 `data == null` 이면 localStorage remove, 값이 있으면 localStorage set.
- `getAsync` — `fn` 이 없으면 localStorage get 결과를 반환한다.

### `injectSdSystemConfigResource`

사용법: [client-system-config.md](../../manuals/client-system-config.md)

```ts
function injectSdSystemConfigResource<T>(options: { key: Signal<string | undefined> }): {
  value: Signal<T | undefined>;
  isLoading: Signal<boolean>;
  status: Signal<unknown>;
  hasValue: () => boolean;
  reload: () => boolean;
  set(value: T | undefined): void;
  update(fn: (prev: T | undefined) => T | undefined): void;
}
```

- `options.key` — 설정 key의 동적 suffix. 실제 저장 key는 호스트 tag와 합친 `${hostTag}.${key}` 이다.
- `value`/`isLoading`/`status`/`hasValue`/`reload` — Angular `resource` 에서 노출한 조회 상태.
- `set` — resource 값을 먼저 바꾸고 `key` 가 있으면 microtask에서 `SdSystemConfigProvider.setAsync` 로 저장한다.
- `update` — 현재 값을 함수로 변환해 `set` 과 같은 저장 흐름을 탄다.

### `SdSystemLogProvider`

사용법: [client-system-log.md](../../manuals/client-system-log.md)

```ts
class SdSystemLogProvider {
  writeFn?: (severity: "error" | "warn" | "log", ...data: any[]) => Promise<void> | void;
  writeAsync(severity: "error" | "warn" | "log", ...data: any[]): Promise<void>;
}
```

- `writeFn` — 콘솔 기록 뒤 추가로 호출할 외부 log sink. throw/reject하면 내부 logger에 error로만 남긴다.
- `severity` — `"error"`, `"warn"`, `"log"` 중 하나. 내부 logger의 같은 이름 메서드를 호출한다.
- `data` — logger와 `writeFn` 에 그대로 전달되는 가변 인자.
- 자동 호출처 — `SdGlobalErrorHandlerPlugin` 과 `SdToastProvider.try()` 가 system log에 error/warn을 기록한다.

### `SdServiceClientFactoryProvider`

사용법: [client-service.md](../../manuals/client-service.md)

```ts
class SdServiceClientFactoryProvider {
  connectAsync(key: string, options?: Partial<ServiceConnectionOptions>): Promise<void>;
  closeAsync(key: string): Promise<void>;
  get(key: string): ServiceClient;
}
```

- `key` — 연결 client를 식별하는 문자열. 이미 연결된 key나 닫힌 key로 `connectAsync` 하면 throw한다.
- `options` — `location.hostname`, `location.port`, `location.protocol` 에서 만든 기본 host/port/ssl 위에 merge할 service-client 옵션.
- `connectAsync` — `createServiceClient(clientName, mergedOptions)` 후 connect하고 request/response progress 이벤트를 progress toast에 연결한다.
- `closeAsync` — 연결된 client를 close하고 key를 닫힘 상태로 기록한다. 미연결 key면 throw한다.
- `get` — 연결된 `ServiceClient` 를 반환한다. 닫힌 key 또는 미연결 key면 throw한다.

### `SdGlobalErrorHandlerPlugin`

사용법: [client-system-log.md](../../manuals/client-system-log.md)

```ts
class SdGlobalErrorHandlerPlugin implements ErrorHandler {
  handleError(event: unknown): false;
}
```

- `event` — `PromiseRejectionEvent`, `ErrorEvent`, `Error`, 기타 값. browser가 아니면 logger에만 남긴다.
- browser 동작 — 첫 에러만 system log에 기록하고 Angular app을 destroy한 뒤 full-screen overlay를 body에 붙인다.
- `ErrorEvent.error == null` — overlay 대신 `SdSystemLogProvider.writeAsync("warn", message)` 만 호출한다.
- overlay click — dev mode가 아니면 `location.hash = "/"` 후 reload한다.
