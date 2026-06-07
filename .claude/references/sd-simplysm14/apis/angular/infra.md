# @simplysm/angular — 앱 부트스트랩·전역 설정

앱 시작 시 1회 배선하는 `provideSdAngular` 와, `providedIn: "root"` 로 어디서든 inject 하는 전역 프로바이더(테마·로컬스토리지·시스템설정·시스템로그·서비스클라이언트)를 모은 군. 화면보다 부트스트랩(`provideAppInitializer`)·앱 셸·설정 코드에서 같이 읽힌다.

## provideSdAngular

zoneless Angular 앱의 핵심 프로바이더 묶음을 `EnvironmentProviders` 로 생성. `bootstrapApplication` 의 `providers` 에 한 번 넣음.

- `opt.clientName: string` — 클라이언트 식별명. `SdAngularConfigProvider.clientName` 으로 저장되어 로컬스토리지 키 prefix·서비스 클라이언트 연결명에 쓰임.

배선 내용(본문 기준): zoneless 변경 감지, ng-icons 기본 설정(stroke 1.5, size 1.33em), `IMAGE_CONFIG` 경고 끔, 전역 `ErrorHandler` 를 `SdGlobalErrorHandlerPlugin` 으로, `EVENT_MANAGER_PLUGINS` 에 `SdOptionEventPlugin` 추가, `window` 의 `error`/`unhandledrejection` 을 `ErrorHandler` 로 위임, 저장된 dark/fontSize 를 `SdThemeProvider` 에 복원하고 변경 시 로컬스토리지에 영속, 서비스워커 업데이트 주기 폴링(확인 시 새로고침 prompt, 실패 시 지수 백오프), 라우터 네비게이션 동안 `SdBusyProvider.globalBusyCount` 증감.

```ts
bootstrapApplication(AppComponent, {
  providers: [provideSdAngular({ clientName: "wms-admin" }), provideRouter(routes)],
});
```

## SdAngularConfigProvider

`provideSdAngular` 가 채우는 전역 설정 보관소. 직접 set 하지 않고 `provideSdAngular(opt)` 로 주입됨.

- `clientName: string` — 앱 식별명. 로컬스토리지 키·서비스 클라이언트명으로 참조.

## SdThemeProvider

다크모드·글자크기 전역 상태. `provideSdAngular` 가 로컬스토리지와 동기화. `sd-theme-selector` 가 이 프로바이더를 토글.

- `dark: WritableSignal<boolean>` — 다크 모드 여부. true 면 `document.body` 에 `sd-theme-dark` 클래스 토글. 다크/라이트 전환 시.
- `fontSize: WritableSignal<number>` — 루트 글자 크기(px). 변경 시 `documentElement.style.fontSize` 반영.
- `fontSizePresets: readonly number[]` — 선택 가능한 글자 크기 단계(`[12,14,16,20,24,28]`).
- `increaseFontSize()` / `decreaseFontSize()` — 프리셋에서 한 단계 위/아래로 이동.

## SdLocalStorageProvider<T>

`clientName` 을 prefix 로 붙여 `localStorage` 에 JSON 직렬화 저장/조회. 제네릭 `T` 로 키→값 타입 매핑.

- `set<K>(key, value)` — `"{clientName}.{key}"` 키에 `JSON.stringify` 저장.
- `get<K>(key): T[K] | undefined` — 저장값 파싱. 없거나 파싱 실패 시 `undefined`(결측 보존).
- `remove(key)` — 키 삭제.

```ts
private readonly _ls = inject<SdLocalStorageProvider<{ lastTab: string }>>(SdLocalStorageProvider);
this._ls.set("lastTab", "summary");
```

## SdSystemConfigProvider<T>

화면별 사용자 설정(시트 컬럼 구성 등)을 서버 또는 로컬에 저장/조회. `fn` 미설정 시 `SdLocalStorageProvider` 로 폴백.

- `fn?: { set(key, data); get(key) }` — 외부 저장 콜백. 설정하면 서버 등에 위임, 미설정 시 로컬스토리지 사용.
- `setAsync<K>(key, data)` — `data` 가 null 이면 삭제, 아니면 저장.
- `getAsync(key)` — 저장값 조회.

## injectSdSystemConfigResource<T>

`SdSystemConfigProvider` 를 host 태그명+key 로 감싼 Angular `resource` 래퍼. 시트가 컬럼 구성 영속화에 사용. injection 컨텍스트에서 호출.

- `options.key: Signal<string | undefined>` — 설정 식별 키 시그널. `undefined` 면 로드/저장 안 함. 저장 키는 `"{호스트태그}.{key}"`.
- 반환: `value`/`isLoading`/`status`/`hasValue()`/`reload()` 와, 값을 set 하면 즉시 `setAsync` 로 영속하는 `set(value)`·`update(fn)`.

## SdSystemLogProvider

콘솔 로깅 + 외부(DB 등) 적재를 겸하는 시스템 로그 프로바이더. 전역 에러 핸들러가 이걸로 에러를 기록.

- `writeFn?: (severity: "error"|"warn"|"log", ...data) => Promise<void>|void` — 외부 적재 콜백. 설정 시 콘솔 출력 후 호출(실패해도 throw 안 하고 logger.error).
- `writeAsync(severity, ...data)` — 콘솔에 해당 severity 로 출력하고, `writeFn` 있으면 함께 적재.

```ts
const sysLog = inject(SdSystemLogProvider);
sysLog.writeFn = (sev, ...data) => appService.systemLog.writeAsync(sev, data);
```

## SdServiceClientFactoryProvider

키별로 `ServiceClient`(`@simplysm/service-client`) 연결을 생성·보관·종료하고, 요청/응답 진행률을 토스트로 표시.

- `connectAsync(key, options?)` — 현재 location(host/port/ssl) 기본값에 `options` 머지해 연결. 이미 연결/종료된 키면 throw. 진행 이벤트를 progress 토스트로.
- `closeAsync(key)` — 해당 키 연결 종료. 미연결 키면 throw.
- `get(key): ServiceClient` — 연결된 클라이언트 반환. 미연결/종료 키면 throw.

앱 서비스 프로바이더(`AppServiceProvider`)가 이 팩토리를 감싸 쓰는 형태이며, 직접 호출보다 앱 프로바이더 경유가 일반적.
