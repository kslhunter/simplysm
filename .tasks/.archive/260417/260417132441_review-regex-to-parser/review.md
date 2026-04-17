# 코드 리뷰: regex-to-parser 구현 검증

## LOGIC-001 [Critical] acorn은 TypeScript를 파싱할 수 없어 서버 빌드의 Worker 패턴이 누락된다

- **위치:** `packages/sd-cli/src/esbuild/esbuild-worker-plugin.ts:48-53`

`findWorkerPatterns()`는 `acorn.parse()`로 소스를 파싱하는데, acorn은 JavaScript 전용 파서로 TypeScript 구문(`import type`, 타입 어노테이션 등)을 처리할 수 없다. 파싱 실패 시 빈 배열을 반환하도록 설계되어 있어(`catch { return []; }`), TypeScript 파일의 Worker 패턴이 **조용히 무시**된다.

`createWorkerBundlePlugin()`의 `onLoad` 핸들러(`:354`)는 `/\.[cm]?[jt]sx?$/` 필터로 `.ts` 파일도 처리한다. 실제 프로덕션 코드에서 확인된 영향:

- `packages/service-server/src/protocol/protocol-wrapper.ts:36` — `import.meta.resolve("../workers/service-protocol.worker")` 패턴이 `.ts` 파일에 존재. `import type` 구문 때문에 acorn 파싱이 실패하여, 서버 빌드 시 이 Worker가 번들되지 않는다.

기존 정규식 방식은 텍스트 기반이므로 TypeScript/JavaScript 구분 없이 동작했다. 이는 **기능 회귀(regression)**이다.

참고: 같은 패키지의 `esbuild-postcss-plugin.ts`도 acorn을 사용하지만, `onEnd` 핸들러에서 이미 빌드된 `.js` 파일만 처리하므로 이 문제가 발생하지 않는다.

**개선 방향:** TypeScript 파일은 먼저 `esbuild.transformSync({ loader: "ts" })`로 타입을 제거한 후 acorn으로 파싱하거나, 사전 필터 + acorn 파싱 실패 시 기존 정규식으로 폴백하는 방식을 고려한다.

---

## LOGIC-002 [Medium] Angular 제어 흐름 블록(@if, @for, @switch)의 표현식이 누락된다

- **위치:** `packages/lint/src/rules/ts-no-unused-protected-readonly.ts:63-118`

`collectTemplateNodeIdentifiers()`는 `value.ast`, `inputs`, `outputs`, `templateAttrs`, `children` 속성만 처리한다. Angular 17+ 제어 흐름 블록 노드(`IfBlockBranch`, `ForLoopBlock`, `SwitchBlockCase`)의 `expression`, `trackBy` 등의 속성은 처리하지 않는다.

실제 Angular 컴파일러 AST 검증 결과:

- `@if (isEnabled)` → `IfBlockBranch.expression.ast` = `PropertyRead("isEnabled")` on `ImplicitReceiver` — **현재 코드에서 누락**
- `@for (item of items; track item.id)` → `ForLoopBlock.expression.ast` = `PropertyRead("items")` on `ImplicitReceiver` — **현재 코드에서 누락**
- `ForLoopBlock.trackBy` 표현식도 누락

코드베이스에서 `@for`, `@if` 사용이 확인됨 (예: `sd-topbar.ts:24`, `sd-topbar-user.ts:33`, `sd-topbar-menu.ts:54` 등).

기존 정규식 방식은 필드 이름을 텍스트 전체에서 매칭했으므로, 제어 흐름 블록 내 참조도 감지했다. AST 방식은 더 정확하지만, 특정 노드 타입의 표현식 속성을 빠뜨리면서 **false positive(미사용으로 오탐)**가 발생한다.

**개선 방향:** `collectTemplateNodeIdentifiers`에서 `expression`, `trackBy`, `expressionAlias` 등 블록 노드 고유 속성도 처리한다. `ForLoopBlock.item` 및 `contextVariables`(`$index`, `$first` 등)도 로컬 변수에 추가해야 한다.

---

## DESIGN-001 [Low] Angular AST 노드를 constructor.name 문자열로 식별한다

- **위치:** `packages/lint/src/rules/ts-no-unused-protected-readonly.ts:34-37`

`collectExprIdentifiers`에서 `ast.constructor?.name === "PropertyRead"`, `"ImplicitReceiver"`, `"ThisReceiver"` 등 문자열 비교로 AST 노드 타입을 판별한다. `@angular/compiler`는 `PropertyRead`, `ImplicitReceiver`, `ThisReceiver` 등의 클래스를 export하므로 `instanceof` 검사가 가능하다.

현재 코드도 ESLint 환경(Node.js, 비압축)에서 동작하므로 당장 깨지지는 않지만, Angular 메이저 버전 업그레이드 시 내부 클래스명이 변경될 경우 조용히 실패할 수 있다.

**개선 방향:** `import { PropertyRead, ImplicitReceiver, ThisReceiver } from "@angular/compiler"` 후 `instanceof` 검사로 교체하면 타입 안전성이 향상된다.

---

## DESIGN-002 [Low] TOML 파싱 실패 시 에러 처리 부재

- **위치:** `packages/sd-cli/src/deps/server-externals/server-production-files.ts:114`

`TOML.parse(miseContent)`는 잘못된 TOML 파일에서 예외를 던진다. 기존 정규식은 매칭 실패 시 조용히 기본값("20")으로 폴백했다. 동작 변경 자체는 더 엄격해져서 오히려 바람직할 수 있으나, 의도적 결정인지 명시되지 않았다.

**개선 방향:** 의도적이라면 현행 유지. 아니라면 try-catch로 래핑하여 파싱 실패 시 경고 로그 + 기본값 폴백을 추가한다.
