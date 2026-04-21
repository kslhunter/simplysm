# HMR Service — LLM 검증

## 검증 항목

- ws 의존성이 sd-cli package.json dependencies에 추가되었는가: `"ws": "^8.20.0"` 확인 (package.json:51)
- @types/ws가 sd-cli package.json devDependencies에 추가되었는가: `"@types/ws": "^8.18.1"` 확인 (package.json:57)
- dev-http-server.ts의 onRequest 훅 타입 시그니처가 올바른가: `onRequest?: (req: http.IncomingMessage, res: http.ServerResponse) => boolean` — Node.js 표준 타입 사용, boolean 반환으로 처리 완료 여부 표시
- hmr-service.ts의 handleRequest가 angularComponentMiddleware와 동일한 encodeURIComponent 패턴을 사용하는가: `templateUpdates.get(encodeURIComponent(componentId))` (hmr-service.ts:65) — vite-angular-plugin.ts:553과 동일 패턴
- WebSocketServer가 httpServer의 upgrade 이벤트를 통해 연결되는가: `new WebSocketServer({ server: httpServer })` (hmr-service.ts:27) — ws 라이브러리가 httpServer의 upgrade 이벤트를 자동 처리

## Slice 2 검증 항목

- import.meta.hot 폴리필이 esbuild banner로 주입되는가: `esbuild-client-config.ts`에서 `templateUpdates != null && legacyModule !== true` 조건으로 banner 생성. `import.meta.hot.on()`, `import.meta.hot.off()`, `globalThis.__hmr_dispatch()` 제공.
- legacyModule일 때 폴리필이 주입되지 않는가: `options.legacyModule !== true` 조건으로 legacyModule에서 banner 미생성.
- ngHmrMode 가드가 있어 prod에서 실행되지 않는가: banner 코드가 `if(typeof ngHmrMode!=="undefined"&&ngHmrMode)` 가드로 래핑. prod에서 `ngHmrMode="false"`로 정의되므로 실행 안됨.
- sd-hmr-reset 플러그인이 onStart에서 templateUpdates.clear()를 호출하는가: `esbuild-client-config.ts`에 `sd-hmr-reset` 플러그인 추가. `build.onStart(() => { options.templateUpdates!.clear(); })` 확인.
- sd-hmr-reset이 angularPlugin보다 먼저 등록되는가: plugins 배열에서 `sd-hmr-reset`이 첫 번째 위치 (angularPlugin, scssPlugin보다 앞). createCompilerPlugin이 templateUpdates에 쓰기 전에 clear됨.
