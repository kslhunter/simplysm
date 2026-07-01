# 클라이언트 SSG(빌드 타임 프리렌더) 매뉴얼

공개 페이지의 검색 노출(SEO)이 필요한 클라이언트를 만들 때 참조. 지정한 라우트의 HTML 을 프로덕션 빌드 시점에 미리 생성해, 검색봇이 완성된 HTML 을 받게 함.

동작 개요:

```
빌드(pnpm build):
  browser 번들 (기존 SPA 와 동일)
  + src/main.server.ts 진입의 node 번들 → 라우트별 <경로>/index.html 생성
  + SPA 셸을 index.csr.html 로 별도 보존

운영(service-server 정적 서빙):
  /q (프리렌더됨)      → 완성된 HTML 즉시 응답 → browser 번들이 hydration 후 SPA 동작
  /r/abc (프리렌더 안 됨) → index.csr.html 셸 + 브라우저에서 데이터 로드 (기존 SPA 와 동일)
```

- dev/watch 모드에는 적용되지 않음 — 개발은 기존 SPA dev 서버 그대로, SSG 동작 확인은 프로덕션 빌드로.
- 라우트 1건이라도 렌더 실패하면 빌드 전체 실패.

## SSG 클라이언트를 셋업하려면

`sd-cli init` 으로 워크스페이스를 새로 만들 때는 클라이언트별 "SSG 를 쓸까요?" 질문에서 켜면 아래 절차가 자동 반영됨 (기본 `prerender: ["/"]`). 아래는 기존 클라이언트에 수동으로 추가하는 절차.

① `sd.config.ts` 의 client 패키지에 `prerender` 로 라우트 목록 지정:

```ts
"client-portal": {
  target: "client",
  server: "server",
  prerender: ["/", "/about"],
},
```

② `@angular/platform-server` 의존성 추가 (클라이언트 패키지 `package.json`, Angular 패키지들과 동일 버전).

③ 라우팅을 path 방식으로 — 검색엔진은 hash(`/#/about`) 뒤를 별개 페이지로 보지 않으므로 `withHashLocation()` 제거:

```ts
provideRouter(routes), // withHashLocation() 없이
```

④ 앱 설정에 hydration 추가:

```ts
import { provideClientHydration } from "@angular/platform-browser";

providers: [..., provideClientHydration()],
```

⑤ `src/main.server.ts` 작성 (Angular 표준 — 서버 부트스트랩 default export):

```ts
import { bootstrapApplication, type BootstrapContext } from "@angular/platform-browser";
import { provideServerRendering } from "@angular/platform-server";
import { AppRoot } from "./app.root";
import { appProviders } from "./app.providers"; // main.ts 와 공유하는 providers

const bootstrap = (context: BootstrapContext) =>
  bootstrapApplication(
    AppRoot,
    { providers: [...appProviders, provideServerRendering()] },
    context,
  );

export default bootstrap;
```

## 프리렌더 화면 코드를 SSR-safe 하게 작성하려면

프리렌더 라우트에서 쓰는 코드는 빌드 시 node 에서 한 번 실행됨. 컴포넌트 생성·초기화 시점에 브라우저 전역(`window`/`document`/`localStorage`)을 직접 만지면 빌드가 실패함 (빌드 에러로 즉시 드러남).

- 이벤트 핸들러 안의 브라우저 API 는 무방 — 서버에서는 실행되지 않음.
- 생성자·`effect()` 등 초기화 경로의 브라우저 API 는 가드:

```ts
import { inject, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";

if (isPlatformBrowser(inject(PLATFORM_ID))) {
  // 브라우저 전용 초기화
}
```

- 또는 `afterNextRender(() => { ... })` — 브라우저에서만 실행됨.
- **프리렌더 시점에는 서버 연결이 없음** — 프리렌더 화면의 초기화 경로에서 서비스 RPC·ORM(`connectAsync`)·공유데이터 호출 금지. 데이터가 필요하면 브라우저 시점(hydration 후)으로 미루거나, 그 화면을 비프리렌더 라우트로 둠. `main.server.ts` 에 `connectAsync()` 부트스트랩 배선을 복사하지 않는 것도 같은 이유.
- `@simplysm/angular` 부트스트랩 경로(provideSdAngular·테마·busy 등)는 이미 가드되어 그대로 사용 가능. 그 외 컴포넌트는 프리렌더 화면에 쓸 때 개별 확인 — 빌드가 깨지면 그 컴포넌트의 초기화 경로를 가드.

## 지킬 것

- SEO 대상 페이지는 빌드 시점에 URL 이 고정된 라우트만 가능 — 동적 URL(예: `/r/:id`) 은 프리렌더 불가, 셸 폴백으로 동작하며 검색 노출 안 됨. 동적 페이지 SEO 가 필요해지면 SSG 가 아니라 SSR 검토.
- `prerender` 라우트는 `"/"` 로 시작.
- 프리렌더 결과는 빌드 시점 데이터로 고정 — 콘텐츠 갱신은 재빌드·재배포로 반영됨을 전제로 라우트를 선정.
- 기존 SPA 클라이언트에 영향 없음 — `prerender` 미설정 클라이언트는 동작이 바뀌지 않으므로, SEO 필요 페이지를 별도 클라이언트 패키지로 분리하는 구성을 우선 검토.
