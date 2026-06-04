# @simplysm/angular — 부트스트랩·전역 프로바이더

앱 시작 시 1회 배선하는 `provideSdAngular` 와, `providedIn: "root"` 로 어디서든 inject 하는 전역 프로바이더(테마·로컬스토리지·시스템설정·시스템로그·서비스클라이언트·설정값)를 모은 군. 화면이 아니라 부트스트랩(`provideAppInitializer`)·앱 셸 코드에서 같이 읽힌다.

## provideSdAngular

```ts
function provideSdAngular(opt: { clientName: string }): EnvironmentProviders
```

`ApplicationConfig.providers` 에 1개 넣으면 simplysm 클라이언트 동작 전체가 배선됨. 내부 처리:

- `clientName` — 이 클라이언트의 식별 이름. `SdAngularConfigProvider.clientName` 으로 보관되어 로컬스토리지 키 prefix, 서비스 클라이언트 이름, 시스템 로그 `clientName` 등에 사용. `provideSdAngular({ clientName: CLIENT_NAME })` 형태로 전달하며, 시스템 로그 배선 시 같은 값을 씀(`client-system-log.md`).
- ng-icons 전역 설정(strokeWidth 1.5, size 1.33em), `IMAGE_CONFIG`(이미지 경고 비활성), `provideZonelessChangeDetection()`.
- 테마(dark/fontSize) 를 `SdLocalStorageProvider` 와 양방향 동기화(저장값 복원 + 변경 시 저장).
- `window` 의 `unhandledrejection`/`error` 를 `ErrorHandler` 로 위임 + `ErrorHandler` 를 `SdGlobalErrorHandlerPlugin` 으로 교체(미처리 에러를 전체화면 표시 + 시스템로그 적재).
- `EVENT_MANAGER_PLUGINS` 에 `SdOptionEventPlugin`(capture/passive/once 이벤트 옵션 지원) 추가.
- service-worker(`SwUpdate`) 가 있으면 5분 주기(실패 시 지수 백오프, 최대 1시간)로 업데이트 확인 후 사용자 confirm → reload.
- 라우터가 있으면 네비게이션 시작/종료에 `SdBusyProvider.globalBusyCount` 를 ±1 → 전역 busy 표시.

사용: `bootstrapApplication(AppRoot, { providers: [provideSdAngular({ clientName: CLIENT_NAME }), provideRouter(...), ...] })`.

## SdAngularConfigProvider

- `clientName: string` — `provideSdAngular` 가 주입하는 클라이언트 이름. 다른 provider 가 prefix/식별자로 참조. 보통 직접 set 하지 않음.

## SdThemeProvider

다크모드·기본 글자크기 전역 상태. `provideSdAngular` 가 로컬스토리지 동기화를 자동 배선하므로 화면에서는 토글만 호출.

- `dark: WritableSignal<boolean>` — 다크모드 on/off. true 면 `<body>` 에 `sd-theme-dark` 클래스 토글. 테마 전환 UI 에서 set.
- `fontSize: WritableSignal<number>` — 루트 폰트 크기(px). 변경 시 `<html>` 의 `font-size` 적용(전체 rem 기준 스케일).
- `fontSizePresets: readonly number[]` — `[12,14,16,20,24,28]`. 증감 단계 후보.
- `increaseFontSize(): void` / `decreaseFontSize(): void` — presets 안에서 한 단계 위/아래로 이동. 경계면 무변경.
- 사용: 테마 선택 UI 는 `sd-theme-selector`(features.md) 가 이 provider 를 래핑. 직접 다크 토글은 `inject(SdThemeProvider).dark.update(v => !v)`.

## SdLocalStorageProvider<T>

`localStorage` 를 `<clientName>.<key>` 네임스페이스로 JSON 직렬화해 읽고 씀. 제네릭 `T` 로 키→값 타입 매핑.

- `set<K extends keyof T & string>(key: K, value: T[K]): void` — `JSON.stringify` 후 저장.
- `get<K extends keyof T & string>(key: K): T[K] | undefined` — 파싱해 반환. 미존재·파싱실패 시 `undefined`(결측 보존).
- `remove(key: keyof T & string): void` — 삭제.
- 사용: `inject<SdLocalStorageProvider<{ "last-tab": string }>>(SdLocalStorageProvider)`.

## SdSystemConfigProvider<T>

화면별 설정(시트 컬럼 구성, 모달 위치 등) 영속화. 외부 저장 함수(`fn`) 가 꽂혀 있으면 그쪽, 없으면 `SdLocalStorageProvider` 로 폴백.

- `fn?: { set(key, data): Promise<void>|void; get(key): PromiseLike<unknown> }` — 서버 등 외부 저장소 연동 훅. 부트스트랩에서 할당하면 모든 설정이 외부로 영속. 미할당이면 로컬스토리지만 사용.
- `setAsync<K>(key: K, data: T[K] | undefined): Promise<void>` — `fn` 있으면 위임, 없으면 로컬스토리지에 저장(데이터 `null` 이면 remove).
- `getAsync(key): Promise<unknown>` — `fn` 있으면 위임, 없으면 로컬스토리지 get.
- 직접 호출보다 `injectSdSystemConfigResource` (아래) 로 컴포넌트별 자동 키 분리·resource 화해 쓰는 게 표준.

## injectSdSystemConfigResource<T>

```ts
function injectSdSystemConfigResource<T>(options: { key: Signal<string | undefined> }): {
  value: Signal<T | undefined>;
  isLoading: Signal<boolean>;
  status: Signal<...>;
  hasValue(): boolean;
  reload(): void;
  set(value: T | undefined): void;
  update(fn: (prev: T | undefined) => T | undefined): void;
}
```

`SdSystemConfigProvider` 위에 Angular `resource` 를 얹은 컴포넌트 스코프 헬퍼. 실제 저장 키는 `<호스트엘리먼트태그>.<key>` 로 자동 분리되어 같은 컴포넌트 종류끼리 설정을 공유.

- `options.key: Signal<string | undefined>` — 설정 키 signal. `undefined` 면 로드/저장 스킵. 컴포넌트의 `key` 입력을 그대로 넘김.
- `set` — 메모리 즉시 반영 후 microtask 로 `setAsync` 영속(실패 시 ErrorHandler 로 전파, silent skip 아님).
- `sd-sheet` 가 컬럼 설정을 이걸로 보관(sheet.md 참조).

## SdSystemLogProvider

프레임워크가 잡은 에러/경고를 콘솔 + (배선 시) 외부 저장소로 적재. 자세한 배선·자동 적재 지점은 `client-system-log.md` 참조.

- `writeFn?: (severity: "error"|"warn"|"log", ...data: any[]) => Promise<void>|void` — 외부 적재 함수. 부트스트랩에서 1회 할당(예: DB insert). 미할당 시 콘솔만.
- `writeAsync(severity: "error"|"warn"|"log", ...data: any[]): Promise<void>` — 항상 콘솔(`createLogger("angular:system-log")`)로 먼저 찍고, `writeFn` 있으면 추가 적재. `writeFn` 호출은 try/catch 로 감싸 실패해도 throw 하지 않음(로그 싱크 실패가 본 동작을 막지 않게 한 의도된 설계).
  - `severity` 값 차이: `"error"` = 문제 발생, `"warn"` = 인지 필요, `"log"` = 일반. `SdGlobalErrorHandlerPlugin`·`SdToastProvider.try/danger` 가 자동으로 `"error"` 적재.
- 직접 적재: `await this._sdSystemLog.writeAsync("error", "결제 승인 실패", err.stack)`.

## SdServiceClientFactoryProvider

`@simplysm/service-client` 의 `ServiceClient` 를 key 별로 생성·보관·종료. 요청/응답 진행률을 자동으로 토스트 progress 로 표시.

- `connectAsync(key: string, options?: Partial<ServiceConnectionOptions>): Promise<void>` — key 로 클라이언트 연결. host/port/ssl 미지정 시 현재 `location` 기준 기본값. 이미 연결됐거나 닫힌 key 면 throw. 연결 중 `request-progress`/`response-progress` 를 받아 `SdToastProvider.info(..., true)` progress 로 갱신.
- `closeAsync(key: string): Promise<void>` — 연결 종료 + 해당 key 를 닫힘 처리(재연결 불가). 미연결 key 면 throw.
- `get(key: string): ServiceClient` — 연결된 클라이언트 반환. 미연결/닫힘이면 throw(silent 반환 안 함).
- 앱은 보통 `AppServiceProvider` 가 이걸 래핑(`client-service.md`). 화면에서 직접 inject 하기보다 앱 provider 경유.
