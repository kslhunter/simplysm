# @simplysm/angular — infrastructure

앱 인프라 프로바이더·DOM 이벤트/효과 디렉티브·유틸 함수·타입 헬퍼. 전부 standalone, root 제공자거나 함수.

## 설정·저장 프로바이더

### SdSystemLogProvider (root)

```ts
writeFn?: (severity, ...data) => Promise<void>|void;
writeAsync(severity: "error"|"warn"|"log", ...data): Promise<void>;
```

- consola 태그(`angular:system-log`)로 로컬 로그. `writeFn` 세팅 시 서버 등으로 추가 전송. 전송 실패는 로컬 error 만 남기고 throw 안 함.

### SdLocalStorageProvider<T> (root)

```ts
set<K>(key: K, value: T[K]); get<K>(key: K): T[K]|undefined; remove(key: K);
```

- 키 prefix = `clientName` (`SdAngularConfigProvider`). JSON 직렬화. 파싱 실패 시 undefined.

### SdSystemConfigProvider<T> (root)

```ts
fn?: { set<K>(key, data): Promise<void>|void; get(key): PromiseLike<any> };
setAsync<K>(key, data): Promise<void>;
getAsync(key): Promise<...>;
```

- `fn` 미세팅이면 `SdLocalStorageProvider` 위임. `fn` 세팅 시 서버 영구 저장으로 전환. 모달 사이즈·시트 컬럼 설정·프리셋이 이걸 통함.

### injectSdSystemConfigResource<T>

```ts
function injectSdSystemConfigResource<T>(options: { key: Signal<string|undefined> }): {
  value: Signal<T|undefined>; isLoading: Signal<boolean>;
  status; hasValue(); reload();
  set(value: T|undefined): void;
  update(fn: (prev: T|undefined) => T|undefined): void;
};
```

- 컴포넌트의 element tag + key signal 조합으로 `SdSystemConfigProvider` 값 resource 화. `set`/`update` 시 microtask 로 server 저장(에러는 `ErrorHandler.handleError`).

## 서비스 클라이언트

### SdServiceClientFactoryProvider (root)

```ts
connectAsync(key: string, options?: Partial<ServiceConnectionOptions>): Promise<void>;
closeAsync(key: string): Promise<void>;
get(key: string): ServiceClient;
```

- key 별 `ServiceClient` 풀. `connectAsync` 시 기본 host/port 는 현재 `location` 기준(https 면 443, http 면 80). request/response progress 시 자동으로 `SdToastProvider.info(..., true)` progress 토스트.
- 중복 connect 또는 closed key 재사용은 throw. destroy 시 모든 클라이언트 close.

## 파일·에러·테마

### SdFileDialogProvider (root)

```ts
showAsync(multiple?: false, accept?: string): Promise<File|undefined>;
showAsync(multiple: true, accept?: string): Promise<File[]|undefined>;
```

- `<input type="file">` 동적 생성 → click → 선택 후 결과. 취소 시 undefined.
- `accept` — MIME/확장자(`"image/*"`·`".pdf,.docx"`).

### SdGlobalErrorHandlerPlugin (Angular `ErrorHandler` 교체용)

- `provideSdAngular` 가 자동 등록. 직접 등록 안 해도 됨.
- `PromiseRejectionEvent`/`ErrorEvent`/`Error`/임의 값 분류해 `SdSystemLogProvider.writeAsync('error', ...)` + 전체 화면 에러 오버레이 표시 + Angular `ApplicationRef.destroy()`. 오버레이 클릭 → 홈으로 reload.

### SdThemeProvider (root)

```ts
dark: WritableSignal<boolean>;
readonly fontSizePresets: readonly number[];   // [12,14,16,20,24,28]
fontSize: WritableSignal<number>;              // body html font-size px
increaseFontSize(): void; decreaseFontSize(): void;
```

- `dark` 효과 → `<body class="sd-theme-dark">`. `fontSize` → `<html style="font-size:Npx">`.
- `increase`/`decrease` — presets 의 인접 값으로만 이동.

### SdThemeSelector — `<sd-theme-selector>`

- inputs 없음. 팔레트(다크 토글) + 폰트 크기 ± 버튼 UI.

## 유틸 함수

### FormatPipe — `{{ value | format: pattern }}`

- `value: string|DateTime|DateOnly|undefined`, `format: string` → 포맷팅된 string.
- DateTime/DateOnly → `toFormatString(format)`.
- 문자열 → `X` 자리에 1글자씩 매핑. `|` 로 여러 패턴 alt 가능(value 길이 일치하는 첫 패턴 선택). 매칭 실패 시 원본 반환.
- 예: `"01012345678" | format: "XXX-XXXX-XXXX|XXX-XXX-XXXX"` → `"010-1234-5678"`.

### mark

```ts
function mark(sig: WritableSignal<any>): void
```

- in-place mutation 후 signal 소비자에게 변경 알림. 배열은 shallow copy, 객체는 spread. mutable 데이터로 setter 호출 누락 방지용.

### setSafeStyle

```ts
function setSafeStyle(renderer: Renderer2, el: HTMLElement, style: Partial<CSSStyleDeclaration>): void
```

- `Renderer2.setStyle` 을 객체 단위로 일괄 적용. SSR/zoneless 안전.

### setupBgTheme

```ts
function setupBgTheme(options?: {
  theme?: "primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray";
  lightness?: "lightest"|"lighter";
}): void
```

- 컴포넌트 진입 동안 `document.body --background-color` 를 테마 변수로 설정. destroy 시 원복.
- `lightness` 기본 `lightest`.

### setupModelHook

```ts
function setupModelHook<T>(model: WritableSignal<T>, canFn: Signal<(item: T) => boolean|Promise<boolean>>): void
```

- model 의 `set`/`update` 를 가로채 `canFn(value)` 결과가 true(또는 Promise<true>) 일 때만 적용. false 면 무시. Promise reject 는 `ErrorHandler`.
- 체크박스/스위치 등의 `canChangeFn` 패턴 구현체.

## 타입 헬퍼

```ts
type UndefToOptional<T>            // undefined 가능 prop 을 optional 로
type DirectiveInputSignals<T>      // 컴포넌트의 InputSignal prop → 값 타입 객체
type WithOptional<T, K extends keyof T>   // 일부 키를 optional 로
```

- `SdModalInfo.inputs` / `SdPrintInput.inputs` 등의 타입 빌딩에 사용.

## DOM 이벤트 디렉티브

### SdEvents — `<el (click.capture)="..." (scroll.passive)="..." ...>`

- 이벤트 이름 끝에 `.capture`/`.passive`/`.once` 조합 가능한 다중 셀렉터 디렉티브. 표준 Angular 이벤트 바인딩으로는 옵션 못 주는 listener option 활성.
- 지원 이벤트: click/mouse*/keydown/keyup/focus/blur/invalid/scroll/wheel/touch*/drag*/transitionend/animationend.

### SdOptionEventPlugin

- `provideSdAngular` 가 `EVENT_MANAGER_PLUGINS` 에 등록. `SdEvents` 가 의존. 직접 호출 X.

### SdResizeDirective — `[sdResize]`

```ts
sdResize = output<SdResizeEvent>();
interface SdResizeEvent { heightChanged: boolean; widthChanged: boolean; target: HTMLElement; contentRect: DOMRectReadOnly; }
```

- `ResizeObserver` + rAF 디바운스. 너비/높이 변경 플래그 포함.

### SdIntersectionDirective — `[sdIntersection]`

```ts
sdIntersection = output<SdIntersectionEvent>();
interface SdIntersectionEvent { entry: IntersectionObserverEntry; }
```

- `IntersectionObserver` 래퍼. 무한 스크롤 트리거 등.

### SdCommandDirective — `[sdRefreshCommand]`/`[sdSaveCommand]`/`[sdInsertCommand]`

- 전역 키 단축키 출력. `Ctrl+Alt+L` → refresh, `Ctrl+S` → save, `Insert` → insert. 최상위 열린 모달 또는 호스트가 활성 영역일 때만 발화(다른 모달 위면 무시).

## 효과 디렉티브

### SdRipple — `[sdRipple]` + setupRipple

```ts
enabled = input.required({ alias: "sdRipple", transform: booleanAttribute });
```

- 클릭 시 머티리얼풍 잉크 효과. `setupRipple(enableFn?)` 은 컴포넌트 안에서 inject 후 직접 호출하는 형태.

### SdShowEffect — `[sdShowEffect]` + setupRevealOnShow

```ts
enabled = input.required({ alias: "sdShowEffect", transform: booleanAttribute });
sdShowEffectType = input<"l2r"|"t2b">("t2b");
```

- 스크롤로 첫 표시 시 페이드인 + 슬라이드. `l2r`: 좌→우, `t2b`: 위→아래(기본).

### SdInvalid — `[sdInvalid]` + setupInvalid

```ts
invalidMessage = input.required<string>({ alias: "sdInvalid" });
```

- 호스트 요소를 invalid 상태로 표시(빨간 점 인디케이터 + form submit 막기). 빈 문자열이면 valid. 직접 form 검증 메시지 표시할 때.

## 템플릿 디렉티브

### SdTypedTemplate — `<ng-template typed>`

```ts
class SdTypedTemplate<T> { typed = input.required<T>(); }
```

- 템플릿 컨텍스트 타입 명시용. `typed` 에 token 값/객체 바인딩.

### SdItemOfTemplate — `<ng-template itemOf>`

```ts
class SdItemOfTemplate<TItem> { itemOf = input.required<TItem[]>(); }
interface SdItemOfTemplateContext<TItem> { $implicit: TItem; item: TItem; index: number; depth: number; }
```

- 리스트 아이템 템플릿 컨텍스트 타입 추론. `let-item`, `let-index="index"`, `let-depth="depth"` 사용 가능. `SdCalendar` 등이 자식으로 요구.

## 주의

- `provideSdAngular` 호출만으로 `SdGlobalErrorHandlerPlugin`/`SdOptionEventPlugin`/`SdEvents` 가 모두 활성. 별도 추가 불필요.
- `SdLocalStorageProvider`/`SdSystemConfigProvider` 의 키는 `clientName.<key>` 형태. 같은 도메인의 다른 simplysm 앱과 충돌 방지.
