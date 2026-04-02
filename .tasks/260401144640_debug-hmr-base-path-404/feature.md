# Feature 1.1 HMR 미들웨어 base path 지원

## 참조 자료

- [debug.md](./debug.md)
- 이슈: `kslhunter/simplysm#10`
- 대상 파일: `packages/sd-cli/src/angular/vite-angular-plugin.ts`
- 대상 함수: `angularComponentMiddleware` (L428-447)
- base path 설정: `packages/sd-cli/src/utils/vite-config.ts` (L144) — `base: /${name}/`
- Vite `baseMiddleware`: `node_modules/vite/dist/node/chunks/config.js` (L20558-20583) — `configureServer` pre-middleware는 baseMiddleware보다 먼저 실행되므로 `req.url`에 base path가 포함된 채 도착

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | 해결 방안 | 방안 B: 미들웨어 내에서 base path 자체 strip | pre-middleware 위치 유지 필요(transformMiddleware보다 먼저 실행). 캡슐화 — 미들웨어 등록 순서에 무관하게 동작 |

## 요구명세

```gherkin
Feature: 1.1 HMR 미들웨어 base path 지원

  Background:
    Given Angular Vite 개발 서버가 실행 중이다
    And angularComponentMiddleware가 등록되어 있다

  Rule: base path가 설정된 환경에서 HMR 컴포넌트 요청을 정상 처리한다

    Scenario: base path가 포함된 @ng/component 요청에 200 응답
      Given Vite base path가 "/client-pda/"로 설정되어 있다
      And templateUpdates에 componentId "testId"의 업데이트가 등록되어 있다
      When 브라우저가 "/client-pda/@ng/component?c=testId"로 요청한다
      Then 200 상태 코드와 text/javascript 컨텐츠 타입으로 응답한다
      And 응답 본문에 해당 componentId의 업데이트 내용이 포함된다

    Scenario: base path가 "/"인 기존 동작이 유지된다
      Given Vite base path가 "/"로 설정되어 있다
      And templateUpdates에 componentId "testId"의 업데이트가 등록되어 있다
      When 브라우저가 "/@ng/component?c=testId"로 요청한다
      Then 200 상태 코드와 text/javascript 컨텐츠 타입으로 응답한다
      And 응답 본문에 해당 componentId의 업데이트 내용이 포함된다

  Rule: @ng/component가 아닌 요청은 next()로 통과한다

    Scenario: base path가 있지만 @ng/component가 아닌 요청은 통과
      Given Vite base path가 "/client-pda/"로 설정되어 있다
      When 브라우저가 "/client-pda/other-path"로 요청한다
      Then next()가 호출되어 다음 미들웨어로 전달된다

    Scenario: base path 없이 @ng/component가 아닌 요청은 통과
      Given Vite base path가 "/"로 설정되어 있다
      When 브라우저가 "/other-path"로 요청한다
      Then next()가 호출되어 다음 미들웨어로 전달된다
```

## 구현계획

### 배경

`angularComponentMiddleware`는 Vite의 `configureServer` 훅에서 pre-middleware로 등록된다. pre-middleware는 Vite 내부의 `baseMiddleware`(base path strip)보다 먼저 실행되므로, `req.url`에 base path가 포함된 채 도착한다. 현재 코드는 `req.url.startsWith("/@ng/component")`로 매칭하여 base path가 `"/"`이 아닌 경우 매칭 실패.

### 목표

- `angularComponentMiddleware`가 base path 환경에서도 `/@ng/component` 요청을 정상 처리

### 비목표

- 미들웨어 등록 순서 변경 (pre-middleware 위치 유지)
- `configureServer` 내 다른 로직(httpServer close handler) 변경

### 설계

`angularComponentMiddleware`에 `basePath: string` 파라미터를 추가한다. `req.url`에서 basePath를 strip한 뒤 `/@ng/component` 매칭을 수행한다. `configureServer`에서 `server.config.base`를 전달한다.

```typescript
// 변경 전
function angularComponentMiddleware(
  templateUpdates: Map<string, string>,
): ... {
  return (req, res, next) => {
    if (req.url == null || !req.url.startsWith("/@ng/component")) {

// 변경 후
function angularComponentMiddleware(
  templateUpdates: Map<string, string>,
  basePath: string,
): ... {
  return (req, res, next) => {
    const url = req.url ?? "";
    const strippedUrl = basePath !== "/" && url.startsWith(basePath)
      ? "/" + url.slice(basePath.length)
      : url;
    if (!strippedUrl.startsWith("/@ng/component")) {
```

호출 측:
```typescript
// 변경 전
server.middlewares.use(angularComponentMiddleware(templateUpdates));

// 변경 후
server.middlewares.use(angularComponentMiddleware(templateUpdates, server.config.base));
```

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| 미들웨어 내 base path strip (방안 B) | 채택 | pre-middleware 위치 유지, 캡슐화 |
| post-middleware로 등록 (방안 A) | 미채택 | transformMiddleware가 먼저 요청을 처리하여 실패 위험 |
| `includes` 매칭 (방안 C) | 미채택 | 의도치 않은 URL 매칭 위험, 근본 원인 미해결 |

### Vertical Slices

- [x] Slice 1: angularComponentMiddleware base path strip 구현 및 테스트

#### Slice 1: angularComponentMiddleware base path strip

- **구현 내용:** `angularComponentMiddleware`에 `basePath` 파라미터 추가, URL strip 로직 구현, `configureServer`에서 `server.config.base` 전달, 기존 테스트 수정 + 신규 테스트 추가
- **호출 그래프:**
  ```mermaid
  flowchart TD
    CS[configureServer] --> ACM[angularComponentMiddleware\nbasePath: server.config.base]
    ACM --> STRIP[URL에서 basePath strip]
    STRIP --> MATCH{startsWith /@ng/component?}
    MATCH -->|Yes| SERVE[200 응답]
    MATCH -->|No| NEXT[next 호출]
  ```
- **Scenarios:**
  - Scenario: base path가 포함된 @ng/component 요청에 200 응답
  - Scenario: base path가 "/"인 기존 동작이 유지된다
  - Scenario: base path가 있지만 @ng/component가 아닌 요청은 통과
  - Scenario: base path 없이 @ng/component가 아닌 요청은 통과
