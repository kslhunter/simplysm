# @simplysm/angular

Angular 클라이언트 앱의 부트스트랩, UI 컨트롤, 화면 골격, 오버레이, 시트/공유데이터, 라우팅·권한·설정 인프라를 제공한다. 컴포넌트는 standalone · `ChangeDetectionStrategy.OnPush` · `ViewEncapsulation.None` 이고, 값은 signal `input()`/`model()`/`output()` 로 노출된다.

## 사용 트리거 인덱스

- **provideSdAngular** — 앱 부트스트랩에서 `@simplysm/angular` 전역 provider 묶음을 한 번 등록할 때. (아래 인라인)
- **코어 유틸·타입 헬퍼** — signal 변경 통지, 값 포맷 pipe, Renderer2 스타일 적용, 모델 변경 가드, modal/print 입력 타입 추출을 다룰 때. (아래 인라인)
- **설정·로그·서비스 인프라** — clientName, localStorage/system config, system log, service-client 연결, 전역 에러 처리를 배선할 때. (아래 인라인) 사용법: [client-service.md](../../manuals/client-service.md), [client-system-log.md](../../manuals/client-system-log.md), [client-system-config.md](../../manuals/client-system-config.md)
- **디렉티브·이펙트** — DOM 이벤트 옵션(`.capture`/`.passive`/`.once`), 리사이즈/교차 관찰, CTRL 단축키, ripple/show/invalid 효과, typed template을 host에 붙일 때. 자세히: [directives.md](./directives.md)
- **폼·입력 컨트롤** — 버튼, 텍스트/날짜/숫자 입력, checkbox/switch, select/dropdown, form, collapse, tab, list, gap, pagination을 조립할 때. 자세히: [controls.md](./controls.md) (lint/template 규칙: [client-rules.md](../../manuals/client-rules.md), `sd-tab`: [client-tab.md](../../manuals/client-tab.md))
- **오버레이·인쇄·파일** — modal, toast, busy overlay, file dialog, browser print/PDF 출력을 호출할 때. 자세히: [overlay.md](./overlay.md) (인쇄/PDF: [client-print.md](../../manuals/client-print.md))
- **라우팅·앱구조·권한** — sdRouterLink, 현재 page code/title/type, canDeactivate, menu/permission tree를 다룰 때. 자세히: [routing-appstructure.md](./routing-appstructure.md) (앱 메뉴·권한 정의: [client-app-structure.md](../../manuals/client-app-structure.md))
- **레이아웃** — sidebar/topbar shell과 메뉴·사용자 메뉴를 구성할 때. 자세히: [layout.md](./layout.md)
- **시트** — `sd-sheet` 기반 목록/편집 표, 컬럼, 셀 템플릿, 컬럼 설정 저장을 다룰 때. 자세히: [sheet.md](./sheet.md) (설정 저장: [client-system-config.md](../../manuals/client-system-config.md), 목록 골격: [client-crud.md](../../manuals/client-crud.md))
- **공유 마스터 데이터·선택 매니저** — shared-data provider, shared-data 선택 UI, selection/sorting/expanding manager를 쓸 때. 자세히: [shared-data.md](./shared-data.md) (공유데이터: [client-shared-data.md](../../manuals/client-shared-data.md), 실시간 이벤트: [event.md](../../manuals/event.md))
- **칸반** — lane/card drag-drop 보드와 카드 다중 선택을 만들 때. 자세히: [kanban.md](./kanban.md)
- **CRUD 골격·권한표·상태 프리셋** — `sd-crud-list`/`sd-crud-detail`, base container, permission table, state preset을 쓸 때. 자세히: [crud.md](./crud.md) (CRUD: [client-crud.md](../../manuals/client-crud.md), 권한: [client-app-structure.md](../../manuals/client-app-structure.md), 설정: [client-system-config.md](../../manuals/client-system-config.md))
- **테마·주소·에디터·시각화** — theme selector/provider, 주소검색 modal, TipTap/Markdown editor, label/note/progress/calendar/barcode/ECharts를 붙일 때. 자세히: [features.md](./features.md)

## 앱 부트스트랩

### `provideSdAngular`

```ts
function provideSdAngular(opt: { clientName: string }): EnvironmentProviders;
```

- `opt.clientName: string` — `SdAngularConfigProvider.clientName` 에 저장되는 클라이언트 이름. `SdLocalStorageProvider` 키 prefix(`${clientName}.${key}`)와 service-client 생성에 쓰인다.
- 등록 항목 — `IMAGE_CONFIG`(이미지 size/lazy 경고 비활성), `NgIcons` 기본(`strokeWidth:1.5`, `size:"1.33em"`), theme localStorage 복원·저장(`sd-theme-dark`/`-blueprint`/`-font-size`), browser `error`/`unhandledrejection` → `ErrorHandler`, `SdAngularConfigProvider`(clientName 주입), `SdOptionEventPlugin`(EVENT_MANAGER_PLUGINS), `SdGlobalErrorHandlerPlugin`(ErrorHandler), `provideZonelessChangeDetection`, service-worker 자동 업데이트 polling(5분~60분 지수 backoff, 확인 시 reload), Router navigation 동안 `SdBusyProvider.globalBusyCount` 증감.
- browser guard — theme 저장·전역 window listener·service-worker·busy는 `isPlatformBrowser` 조건에서만 동작한다.

## 코어 유틸·타입 헬퍼

### `setupBgTheme`

```ts
function setupBgTheme(options?: {
  theme?:
    "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray";
  lightness?: "lightest" | "lighter";
}): void;
```

- `theme` — body `--background-color` 를 `var(--theme-{theme}-{lightness})` 로 바꿀 테마. 없으면 빈 값으로 되돌린다.
- `lightness` — 색 단계. `"lightest"`(기본)/`"lighter"`.
- 동작 — browser에서만 `effect` 로 적용, cleanup 시 빈 값 복원.

### `setSafeStyle`

```ts
function setSafeStyle(
  renderer: Renderer2,
  el: HTMLElement,
  style: Partial<CSSStyleDeclaration>,
): void;
```

- `style` 객체의 own key를 순회해 `renderer.setStyle(el, key, value)` 로 적용한다.

### `setupModelHook`

```ts
function setupModelHook<T>(
  model: WritableSignal<T>,
  canFn: Signal<(item: T) => boolean | Promise<boolean>>,
): void;
```

- `model` — `set`/`update` 가 래핑될 writable signal.
- `canFn` — 새 값 수락 여부 판단 함수. 동기 `false` 차단·`true` 즉시 반영, Promise는 resolve 값이 `false` 일 때만 차단(그 외 반영). reject는 `ErrorHandler.handleError` 로.

### `mark`

```ts
function mark<T extends object | undefined>(sig: WritableSignal<T>): void;
```

- in-place mutation 후 통지용. 배열은 shallow array copy, 객체는 shallow object copy로 `update`; `null`/`undefined` 는 그대로.

### `FormatPipe`

```ts
@Pipe({ name: "format" })
class FormatPipe implements PipeTransform {
  transform(value: string | DateTime | DateOnly | undefined, format: string): string;
}
```

- `value` — `null` 은 빈 문자열, `DateTime`/`DateOnly` 는 `toFormatString(format)`, 문자열은 `X` 마스크 치환.
- `format` — 문자열일 때 `|` 로 나뉜 후보 마스크. `X` 개수가 값 길이와 같은 첫 후보에서 `X` 위치만 값 문자로 치환, 나머지는 리터럴.

### 선택 모달·입력 타입 헬퍼

```ts
interface SelectModalOutputResult<TKey = any> { selectedKeys: TKey[] }
type UndefToOptional<T> = ...
type DirectiveInputSignals<T> = ...
type WithOptional<T, K extends keyof T> = ...
```

- `SelectModalOutputResult.selectedKeys` — 선택 모달 close payload의 선택 key 배열.
- `UndefToOptional<T>` — 값 타입에 `undefined` 가 포함된 property를 optional로 바꾸고 값 타입에서 `undefined` 제외.
- `DirectiveInputSignals<T>` — `T` 의 `InputSignal<V>` property만 골라 `{ property: V }` 로 만들고 `UndefToOptional` 적용. modal/toast/print 의 `inputs` 타입 기반.
- `WithOptional<T, K>` — `T` 에서 `K` key만 optional로 바꾼다(`Omit<T,K> & Partial<Pick<T,K>>`).

## 설정·로그·서비스 인프라

### `SdAngularConfigProvider`

```ts
@Injectable({ providedIn: "root" })
class SdAngularConfigProvider {
  clientName: string;
}
```

- `clientName` — `provideSdAngular({ clientName })` 가 설정하는 앱 식별자. localStorage key prefix와 service-client 생성 인자.

### `SdLocalStorageProvider<T>`

```ts
@Injectable({ providedIn: "root" })
class SdLocalStorageProvider<T> {
  set<K extends keyof T & string>(key: K, value: T[K]): void;
  get<K extends keyof T & string>(key: K): T[K] | undefined;
  remove(key: keyof T & string): void;
}
```

- `key` — `${clientName}.${key}` 로 저장되는 문자열 key. `value` 는 `JSON.stringify`.
- `get` — browser 아님/항목 없음/parse 실패면 `undefined`. `set`/`remove` — browser 아니면 no-op.

### `SdSystemConfigProvider<T>`

사용법: [client-system-config.md](../../manuals/client-system-config.md)

```ts
@Injectable({ providedIn: "root" })
class SdSystemConfigProvider<T> {
  fn?: {
    set<K extends keyof T & string>(key: K, data: T[K] | undefined): Promise<void> | void;
    get(key: keyof T & string): PromiseLike<unknown>;
  };
  setAsync<K extends keyof T & string>(key: K, data: T[K] | undefined): Promise<void>;
  getAsync<K extends keyof T & string>(key: K): Promise<T[K] | undefined>;
}
```

- `fn` — 원격/외부 설정 저장소 hook. 있으면 `setAsync`/`getAsync` 가 localStorage 대신 이 hook 사용.
- `setAsync` — `fn` 없고 `data==null` 이면 localStorage remove, 값 있으면 set. `getAsync` — `fn` 없으면 localStorage get.

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
};
```

- `options.key` — 설정 key의 동적 suffix. 실제 저장 key는 host element tag와 합친 `${elTag}.${key}`.
- `value`/`isLoading`/`status`/`hasValue`/`reload` — Angular `resource` 조회 상태.
- `set` — resource 값을 먼저 바꾸고 `key` 가 있으면 microtask에서 `setAsync` 로 저장(에러는 `ErrorHandler`).
- `update` — 현재 값을 변환해 `set` 흐름.

### `SdSystemLogProvider`

사용법: [client-system-log.md](../../manuals/client-system-log.md)

```ts
@Injectable({ providedIn: "root" })
class SdSystemLogProvider {
  writeFn?: (severity: "error" | "warn" | "log", ...data: any[]) => Promise<void> | void;
  writeAsync(severity: "error" | "warn" | "log", ...data: any[]): Promise<void>;
}
```

- `severity` — `"error"`/`"warn"`/`"log"`. 같은 이름의 내부 logger 메서드를 호출한다.
- `writeFn` — 콘솔 기록 뒤 추가로 호출할 외부 log sink. throw/reject하면 내부 logger.error로만 남기고 rethrow 안 함.
- 자동 호출처 — `SdGlobalErrorHandlerPlugin`, `SdToastProvider.try()`.

### `SdServiceClientFactoryProvider`

사용법: [client-service.md](../../manuals/client-service.md)

```ts
@Injectable({ providedIn: "root" })
class SdServiceClientFactoryProvider {
  connectAsync(key: string, options?: Partial<ServiceConnectionOptions>): Promise<void>;
  closeAsync(key: string): Promise<void>;
  get(key: string): ServiceClient;
}
```

- `key` — 연결 client 식별 문자열. 이미 연결/닫힌 key로 `connectAsync` 하면 throw.
- `options` — `location` 기반 기본 host/port/ssl(`https`→ssl, port 없으면 443/80) 위에 merge.
- `connectAsync` — `createServiceClient(clientName, merged)` 후 connect, request/response progress를 progress toast에 연결.
- `closeAsync` — 연결 client close + key를 닫힘 기록(미연결이면 throw). `get` — 연결 client 반환(닫힘/미연결이면 throw).

### `SdGlobalErrorHandlerPlugin`

사용법: [client-system-log.md](../../manuals/client-system-log.md)

```ts
@Injectable({ providedIn: null })
class SdGlobalErrorHandlerPlugin implements ErrorHandler {
  handleError(event: unknown): false;
}
```

- `event` — `PromiseRejectionEvent`/`ErrorEvent`/`Error`/기타. browser 아니면 logger에만 남긴다.
- browser 동작 — 첫 에러만 system log에 기록하고 Angular app을 destroy한 뒤 full-screen overlay를 body에 붙인다(항상 `false` 반환).
- `ErrorEvent.error == null` — overlay 대신 `writeAsync("warn", message)` 만 호출.
- overlay click — production이면 `location.hash = "/"` 후 reload, dev면 그냥 reload.
