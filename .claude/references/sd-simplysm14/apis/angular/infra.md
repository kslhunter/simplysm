# @simplysm/angular — 부트스트랩·설정·로깅·서비스 인프라

앱 시작 시 1회 설정하는 부트스트랩 함수와 전역 프로바이더 묶음. 앱 부팅 코드(`appConfig`/`main.ts`)·전역 에러·서버 연결·시스템 설정 저장을 다룰 때 함께 읽힘.

## provideSdAngular

`provideSdAngular(opt: { clientName: string }): EnvironmentProviders` — 앱 `providers` 에 1개 추가하면 다음을 일괄 설정. zoneless 변경감지 활성, 전역 에러 핸들러(`SdGlobalErrorHandlerPlugin`) 등록, 옵션 이벤트 플러그인(`SdOptionEventPlugin`) 등록, ng-icons 기본설정(strokeWidth 1.5, size 1.33em), `IMAGE_CONFIG` 경고 비활성, 테마 dark/fontSize 를 로컬스토리지(`sd-theme-dark`/`sd-theme-font-size`)에 자동 영속, service worker 업데이트 폴링(5분~최대1시간 지수 백오프, 갱신 감지 시 새로고침 확인), 라우터 네비게이션 동안 글로벌 busy 카운트 증감.

- opt.clientName: string — 이 클라이언트 식별자. 로컬스토리지 키 prefix·service-client 연결 이름으로 사용. 앱마다 고유 문자열.

```ts
bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes), provideSdAngular({ clientName: "my-app" })],
});
```

## SdAngularConfigProvider

`@Injectable({providedIn:"root"})`. `clientName: string` 필드 1개. `provideSdAngular` 가 채워줌. 다른 프로바이더가 clientName 을 참조할 때 inject.

## SdSystemLogProvider

전역 로그 기록 프로바이더. 콘솔 로그 + 선택적 서버 전송.

- writeFn?: (severity, ...data) => Promise<void> | void — 외부(서버) 전송 훅. 지정하면 매 로그마다 호출. 서버 로그 적재가 필요하면 앱 초기화 때 할당.
- writeAsync(severity: "error"|"warn"|"log", ...data): Promise<void> — 로그 기록. 콘솔에 먼저 출력 후 writeFn 호출. writeFn 이 throw 해도 로깅 자체는 실패하지 않음(내부 logger.error 로 기록).

## SdLocalStorageProvider<T>

`clientName.<key>` 형태로 localStorage 에 JSON 저장/조회. T 는 `{ key: 값타입 }` 맵.

- set<K>(key, value) — JSON.stringify 후 저장.
- get<K>(key): T[K] | undefined — 없거나 파싱 실패 시 undefined(결측 보존).
- remove(key) — 삭제.

## SdSystemConfigProvider<T>

화면별 설정(시트 컬럼 상태, 모달 위치, 상태 프리셋 등) 영속 프로바이더. `fn` 미지정 시 로컬스토리지로 폴백.

- fn?: { set(key, data): Promise|void; get(key): PromiseLike<unknown> } — 서버 영속 훅. 지정하면 서버에 저장/조회, 미지정이면 `SdLocalStorageProvider` 로 폴백. 서버 동기화가 필요하면 앱 초기화 때 할당.
- setAsync<K>(key, data) — data 가 null 이면 제거(폴백 시), 아니면 저장.
- getAsync(key) — 저장된 값 조회.

## injectSdSystemConfigResource<T>

`injectSdSystemConfigResource<T>({ key: Signal<string|undefined> })` — 컴포넌트 내에서 호출. 호스트 엘리먼트 태그명 + key 를 합친 키로 `SdSystemConfigProvider` 에 연동되는 resource 핸들 반환. key 가 undefined 면 로드/저장 안 함.

- key: Signal<string|undefined> — 설정 키 signal. 빈 값이면 비활성.
- 반환: `{ value, isLoading, status, hasValue(), reload(), set(v), update(fn) }`. set/update 는 즉시 로컬 반영 후 microtask 로 비동기 영속(실패 시 errorHandler 로 전달). 시트/상태프리셋이 내부적으로 사용.

## SdServiceClientFactoryProvider

`@simplysm/service-client` 연결을 key 단위로 관리하는 팩토리. 요청/응답 진행률을 토스트로 표시.

- connectAsync(key: string, options?: Partial<ServiceConnectionOptions>): Promise<void> — 연결 생성. host/port/ssl 미지정 시 현재 location 기준 기본값. 같은 key 재연결·끊긴 key 재사용 시 throw.
- closeAsync(key): Promise<void> — 연결 종료. 미연결 key 면 throw.
- get(key): ServiceClient — 연결된 클라이언트 반환. 미연결/끊김이면 throw. 서비스 호출 시 이걸로 ServiceClient 획득.

## SdGlobalErrorHandlerPlugin

`ErrorHandler` 구현. `provideSdAngular` 가 등록하므로 직접 쓸 일은 드묾. 처리되지 않은 에러/Promise 거부를 시스템 로그에 기록하고 전체화면 오류 오버레이를 1회 표시 후 앱을 destroy(클릭 시 새로고침). 직접 inject 하지 말고 `throw` 로 위임.

## SdThemeProvider

`@Injectable({providedIn:"root"})`. 다크모드·폰트크기 전역 상태.

- dark: WritableSignal<boolean> — 다크모드. true 면 body 에 `sd-theme-dark` 클래스 토글.
- fontSize: WritableSignal<number> — 루트 폰트 크기(px). 변경 시 `documentElement.style.fontSize` 반영.
- fontSizePresets: readonly number[] — `[12,14,16,20,24,28]`. 증감 단계.
- increaseFontSize() / decreaseFontSize() — 프리셋 내 다음/이전 단계로 이동.

## SdThemeSelector

`<sd-theme-selector />` — 폰트크기 증감·다크모드 스위치를 드롭다운으로 제공하는 컴포넌트. input 없음. `SdThemeProvider` 를 직접 조작. 탑바 등에 배치.
