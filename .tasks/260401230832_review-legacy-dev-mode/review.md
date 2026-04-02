# 코드 리뷰: legacy dev 모드 구현

| 항목 | 값 |
|------|-----|
| 분석 대상 | `.tasks/260401220155_legacy-dev-mode` (Feature 1.1, 1.2, 1.3) |
| 일시 | 2026-04-01 23:08 |
| 분석 파일 수 | 5개 (vite-config.ts, client.worker.ts, ViteEngine.ts, vite-config.spec.ts, client-worker.spec.ts) |
| 발견 이슈 | 4건 (Critical: 0, Medium: 1, Low: 3) |

## 스펙 대비 구현 검증 요약

Feature 1.1 (플러그인 제거), 1.2 (vite build --watch), 1.3 (HTTP 서버 + live reload) 모두 **스펙에 명시된 요구사항을 정확히 충족**한다. 이벤트 중복 방지 설계(onBuildStart/onBuild는 sdAngularPlugin 경유, RollupWatcher는 생명주기 관리만), emptyOutDir 분기, stopWatch 자원 정리 등 핵심 설계 결정이 올바르게 반영되었다.

---

## 이슈 목록

### LOGIC-001

```
id: LOGIC-001
severity: Medium
category: 로직
location: packages/sd-cli/src/workers/client.worker.ts:126
title: HTTP 서버가 URL 쿼리 스트링을 제거하지 않아 유효한 파일도 SPA fallback으로 처리될 수 있다
description: |
  createLegacyHttpServer의 요청 핸들러에서 `req.url`을 그대로 사용한다.
  브라우저가 `/{name}/main.js?v=123` 등 쿼리 스트링 포함 URL을 요청하면,
  `relativePath`가 `main.js?v=123`이 되어 `path.join(distDir, "main.js?v=123")` 경로로 파일을 탐색한다.
  해당 파일은 존재하지 않으므로 SPA fallback(index.html)이 반환된다.
  
  서비스 워커 업데이트 요청, 브라우저 캐시 무효화 파라미터, 또는 프록시 경유 시
  쿼리 스트링이 붙을 수 있다.
suggestion: |
  `req.url`에서 쿼리 스트링을 제거한 후 경로를 추출한다:
  ```typescript
  const url = (req.url ?? "/").split("?")[0];
  ```
  또는 `new URL(req.url!, "http://localhost").pathname`을 사용한다.
```

### CONSIST-001

```
id: CONSIST-001
severity: Low
category: 일관성
location: packages/sd-cli/src/utils/vite-config.ts:50
title: legacyModule JSDoc이 제거된 import.meta 치환 기능을 여전히 언급한다
description: |
  CreateClientViteConfigOptions.legacyModule의 JSDoc:
  `/** legacy module support (disables code splitting + replaces import.meta) */`
  
  Feature 1.1에서 import.meta 치환 플러그인이 제거되었으므로 "replaces import.meta" 부분이
  현재 동작과 일치하지 않는다. JSDoc 주석 (line 65)도 갱신되었지만 프로퍼티 JSDoc은 누락되었다.
suggestion: |
  `/** legacy module support (disables code splitting) */`로 수정한다.
```

### CONSIST-002

```
id: CONSIST-002
severity: Low
category: 일관성
location: packages/sd-cli/tests/engines/vite-engine.spec.ts:533
title: ViteEngine 테스트 제목이 Feature 1.3 구현과 모순된다
description: |
  테스트: "resolves without serverReady and leaves port undefined for legacyModule"
  
  Feature 1.3에서 startLegacyWatch()는 HTTP 서버 listen 완료 후 serverReady 이벤트를 명시적으로 발행한다.
  테스트가 모킹 환경이라 실제로 이벤트가 발행되지 않는 것은 맞지만,
  제목이 "serverReady 없이 완료된다"로 되어 있어 실제 동작(serverReady 발행)과 모순된다.
  코드를 처음 읽는 사람이 "legacy 모드는 serverReady를 발행하지 않는다"로 오해할 수 있다.
suggestion: |
  테스트 제목을 실제 의미에 맞게 수정한다:
  "leaves port undefined when worker mock does not emit serverReady"
  또는 serverReady를 발행하는 mock 시나리오를 추가하여 port가 설정되는 것도 검증한다.
```

### DESIGN-001

```
id: DESIGN-001
severity: Low
category: 설계
location: packages/sd-cli/src/utils/vite-config.ts:137
title: serverConfig의 host 변경이 legacy dev 모드 범위를 넘어 모든 비-legacy dev 서버에 영향
description: |
  diff에서 `host` 설정이 변경되었다:
  - 이전: `options.serverPort === 0 ? "127.0.0.1" : undefined`
  - 이후: `options.serverPort === 0 ? "127.0.0.1" : "0.0.0.0"`
  
  이 변경은 `mode === "dev"`인 모든 non-zero port dev 서버에 적용된다.
  기존에는 Vite 기본값(localhost)으로 바인딩되던 것이 모든 네트워크 인터페이스로 노출된다.
  legacy dev 모드의 HTTP 서버는 별도 코드(`httpServer.listen(port, "0.0.0.0")`)이므로
  이 변경의 목적이 legacy 지원이라면 불필요하고, 비-legacy dev 서버의 동작이 암묵적으로 바뀐다.
  
  Feature 1.1~1.3 스펙에서 이 변경을 언급하지 않아 의도적인지 불분명하다.
suggestion: |
  의도적이라면 스펙 또는 커밋 메시지에 근거를 명시한다.
  비의도적이라면 `undefined`로 되돌린다.
```
