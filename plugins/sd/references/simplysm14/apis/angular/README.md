# @simplysm/angular

Angular 22 기반 클라이언트 UI 라이브러리. 앱 초기화, UI 컨트롤(입력/선택/버튼), 레이아웃(사이드바/탑바), 데이터 표시(시트/칸반), 모달/토스트, CRUD 기본 컴포넌트, 라우팅·설정·권한 인프라 등을 제공. 모든 컴포넌트는 standalone · `ChangeDetectionStrategy.OnPush` · `ViewEncapsulation.None` 이며, signal 기반 `input()`/`model()`/`output()` 으로 상태 노출.

## 사용 트리거 인덱스

- **provideSdAngular** — 앱 시작 시 전역 provider 및 initializer 등록. 사용법: [client-component.md](../../manuals/client-component.md)
- **앱 설정·로그·서비스 인프라** — clientName, localStorage, system config/log, service-client, 에러 처리 배선. 사용법: [client-service.md](../../manuals/client-service.md), [client-system-config.md](../../manuals/client-system-config.md), [client-system-log.md](../../manuals/client-system-log.md)
- **코어 유틸·타입 헬퍼** — signal 통지(mark), 값 포맷(FormatPipe), 스타일 적용(setSafeStyle), 모델 변경 가드(setupModelHook), 타입 추출(DirectiveInputSignals, WithOptional 등).
- **라우팅·메뉴·권한** — sdRouterLink, 페이지 코드/제목/타입 signal, 화면 이동 가드, 메뉴 구조 유틸. 사용법: [client-app-structure.md](../../manuals/client-app-structure.md)
- **이벤트·효과·디렉티브** — 이벤트 capture, 리사이즈/교차 감지, 단축키, ripple/reveal/invalid 효과, 타입 안전 템플릿. 자세히: 각 항목별 문서
- **UI 컨트롤** — 버튼, 텍스트/날짜/숫자 입력, 체크박스/스위치, 드롭다운, 폼, 탭, 목록, 페이지네이션. 사용법: [client-component.md](../../manuals/client-component.md), [client-tab.md](../../manuals/client-tab.md)
- **컨테이너 레이아웃** — 사이드바·탑바 + 메뉴·사용자 정보.
- **데이터 표시 - Sheet** — 테이블, 정렬, 컬럼 설정, 셀 편집. 자세히: [sheet.md](./sheet.md)
- **데이터 표시 - Kanban** — 칸반 보드, 드래그·드롭 카드. 자세히: [kanban.md](./kanban.md)
- **모달** — 프로그래밍 방식 생성·제어, 기본 모달 2종(prompt/confirm). 자세히: [modal.md](./modal.md)
- **토스트** — 알림 표시, 성공/경고/에러 등급. 자세히: [toast.md](./toast.md)
- **공유 데이터** — 마스터 데이터 관리, 선택 UI. 사용법: [client-shared-data.md](../../manuals/client-shared-data.md). 자세히: [shared-data.md](./shared-data.md)
- **CRUD 기본** — 목록·상세 화면 기본 구조, 행 선택/삭제/복구/엑셀. 사용법: [client-crud.md](../../manuals/client-crud.md). 자세히: [crud.md](./crud.md)
- **인쇄·바쁨** — 화면 인쇄/PDF, 로딩 오버레이. 사용법: [client-print.md](../../manuals/client-print.md)
- **선택·정렬·확장 관리** — 행 선택 매니저, 정렬, 트리 확장.
- **테마·주소·에디터·시각화** — 테마 선택(라이트/다크/색상), 주소 검색, 리치 에디터, 시각 컴포넌트(라벨/진행도/달력/바코드/차트).

## 앱 부트스트랩

### `provideSdAngular`

```ts
function provideSdAngular(opt: { clientName: string }): EnvironmentProviders;
```

- `opt.clientName: string` — `SdAngularConfigProvider.clientName` 에 저장되는 클라이언트 이름. `SdLocalStorageProvider` 키 prefix(`${clientName}.${key}`)와 service-client 생성에 쓰임.
- 등록 항목 — `IMAGE_CONFIG`(이미지 size/lazy 경고 비활성), `NgIcons` 기본(`strokeWidth:1.5`, `size:"1.33em"`), theme localStorage 복원·저장(`sd-theme-dark`/`-blueprint`/`-font-size`), browser `error`/`unhandledrejection` → `ErrorHandler`, `SdAngularConfigProvider`(clientName 주입), `SdOptionEventPlugin`(EVENT_MANAGER_PLUGINS), `SdGlobalErrorHandlerPlugin`(ErrorHandler), `provideZonelessChangeDetection`, service-worker 자동 업데이트 polling(5분-60분 지수 backoff, 확인 시 reload), Router navigation 동안 `SdBusyProvider.globalBusyCount` 증감.
- browser guard — theme 저장·전역 window listener·service-worker·busy는 `isPlatformBrowser` 조건에서만 동작함.

## 코어 유틸·타입 헬퍼

### `setupBgTheme`

```ts
function setupBgTheme(options?: {
  theme?:
    "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray";
  lightness?: "lightest" | "lighter";
}): void;
```

- `theme` — body `--background-color` 를 `var(--theme-{theme}-{lightness})` 로 바꿀 테마. 없으면 빈 값으로 되돌림.
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

- `style` 객체의 own key를 순회해 `renderer.setStyle(el, key, value)` 로 적용함.

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
- `WithOptional<T, K>` — `T` 에서 `K` key만 optional로 바꿈(`Omit<T,K> & Partial<Pick<T,K>>`).

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

- `severity` — `"error"`/`"warn"`/`"log"`. 같은 이름의 내부 logger 메서드를 호출함.
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
- browser 동작 — 첫 에러만 system log에 기록하고 Angular app을 destroy한 뒤 full-screen overlay를 body에 붙임(항상 `false` 반환).
- `ErrorEvent.error == null` — overlay 대신 `writeAsync("warn", message)` 만 호출.
- overlay click — production이면 `location.hash = "/"` 후 reload, dev면 그냥 reload.
