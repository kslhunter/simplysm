# @simplysm/angular — 설정·로깅·서비스 인프라

앱 부트스트랩과 함께 읽히는 인프라 묶음. `provideSdAngular()` 로 전역 프로바이더를 등록하고, 클라이언트명·테마영속화·시스템로그·로컬스토리지·시스템설정·서비스 클라이언트 연결·전역 에러 처리를 담당.

## provideSdAngular

`provideSdAngular(opt: { clientName: string }): EnvironmentProviders` — 앱 부트스트랩 시 `providers` 에 넣는 핵심 프로바이더 묶음.

- `opt.clientName` — 클라이언트 식별명. `SdAngularConfigProvider.clientName` 에 주입되어 로컬스토리지 키 prefix·서비스 클라이언트 생성에 사용. 앱마다 고유해야 함.

등록 내용(본문 기준): 이미지 경고 비활성화, ng-icon 기본 설정, 다크모드/폰트크기 localStorage 영속화 effect, `window` 의 `error`/`unhandledrejection` → ErrorHandler 위임, `SdOptionEventPlugin`(이벤트 옵션 플러그인), `SdGlobalErrorHandlerPlugin`(ErrorHandler), zoneless 변경감지, Service Worker 업데이트 폴링(지수 백오프, 발견 시 confirm 후 reload), 라우터 내비게이션 중 `SdBusyProvider.globalBusyCount` 증감.

```typescript
bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes), provideSdAngular({ clientName: "my-app" })],
});
```

## setupBgTheme

`setupBgTheme(options?: { theme?: ..., lightness?: "lightest" | "lighter" }): void` — 컴포넌트 활성 동안 `document.body` 의 `--background-color` 를 테마 색으로 지정(effect, cleanup 시 복원). 컴포넌트 생성자/필드에서 호출.

- `options.theme` — `"primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray"`. 배경 테마 색. 미지정 시 변수 비움(`""`).
- `options.lightness` — `"lightest"|"lighter"`. 밝기 단계. 기본 `"lightest"`.

## SdAngularConfigProvider

`class SdAngularConfigProvider { clientName!: string }` — `provideSdAngular` 가 설정하는 클라이언트명 보관 루트 프로바이더. 다른 프로바이더가 inject 해 prefix 로 사용.

- `clientName` — 클라이언트 식별명. 직접 set 하지 말고 `provideSdAngular({clientName})` 로 주입됨.

## SdSystemLogProvider

`class SdSystemLogProvider` — 시스템 로그 기록 루트 프로바이더. 콘솔 로깅 + 선택적 외부 전송.

- `writeFn?: (severity, ...data) => Promise<void> | void` — 외부 로그 싱크. 지정 시 `writeAsync` 가 콘솔 출력 후 이 함수도 호출. 미지정이면 콘솔만.
- `writeAsync(severity: "error"|"warn"|"log", ...data): Promise<void>` — 로그 기록. `severity` 로 로거 메서드 선택 후 `writeFn` 있으면 await(실패 시 내부 로깅만, throw 안 함).

## SdLocalStorageProvider

`class SdLocalStorageProvider<T>` — `clientName.{key}` prefix 로 localStorage 에 JSON 저장하는 타입드 래퍼.

- `set<K>(key, value)` — `JSON.stringify` 후 저장. `key` 는 `T` 의 키.
- `get<K>(key): T[K] | undefined` — 파싱 반환. 없거나 파싱 실패 시 `undefined`(결측 보존).
- `remove(key)` — 항목 제거.

## SdSystemConfigProvider

`class SdSystemConfigProvider<T>` — 시스템 설정 저장소. 외부 `fn` 이 있으면 서버, 없으면 localStorage 폴백.

- `fn?: { set(key, data): ...; get(key): PromiseLike<unknown> }` — 외부 저장 핸들러. 지정 시 서버 영속, 미지정 시 `SdLocalStorageProvider` 사용.
- `setAsync<K>(key, data: T[K] | undefined)` — 저장. `fn` 있으면 위임, 없고 `data==null` 이면 remove, 아니면 localStorage set.
- `getAsync(key)` — 조회. `fn` 있으면 위임, 없으면 localStorage get.

## injectSdSystemConfigResource

`injectSdSystemConfigResource<T>(options: { key: Signal<string | undefined> })` — 호스트 엘리먼트 태그명 + `key` 로 시스템 설정을 읽고 쓰는 Angular `resource` 래퍼. 시트/상태프리셋이 컬럼·프리셋 영속화에 사용.

- `options.key` — 설정 키 시그널. `undefined` 면 로드 안 함(결측). 실제 키는 `{태그명}.{key}`.
- 반환: `{ value, isLoading, status, hasValue(), reload(), set(value), update(fn) }` — `set` 은 즉시 resource 갱신 + 마이크로태스크로 `setAsync` 영속화(실패 시 ErrorHandler 위임).

## SdServiceClientFactoryProvider

`class SdServiceClientFactoryProvider` — 키별 `ServiceClient` 연결 풀. 요청/응답 진행률을 토스트 progress 로 표시.

- `connectAsync(key, options?: Partial<ServiceConnectionOptions>)` — `key` 로 클라이언트 연결. 호스트/포트/ssl 은 `location` 기본값 + `options` 머지. 이미 연결/이미 끊긴 키면 throw.
- `closeAsync(key)` — 연결 종료 후 풀에서 제거(미연결 키면 throw).
- `get(key): ServiceClient` — 연결된 클라이언트 반환. 미연결/끊긴 키면 throw.

## SdGlobalErrorHandlerPlugin

`class SdGlobalErrorHandlerPlugin implements ErrorHandler` — `provideSdAngular` 가 `ErrorHandler` 로 등록하는 전역 에러 핸들러.

- `handleError(event)` — `PromiseRejectionEvent`/`ErrorEvent`/`Error`/기타를 분기해 메시지 구성 → 시스템 로그 기록 + 앱 파괴 후 전체화면 에러 오버레이 표시(클릭 시 reload). 최초 1회만 오버레이 노출. 직접 호출보다 Angular 가 자동 호출.
