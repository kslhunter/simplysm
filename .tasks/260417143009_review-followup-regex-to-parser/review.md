# 코드 리뷰: regex-to-parser 마이그레이션 후속 수정(`.tasks/260417132441_review-regex-to-parser/*`) 심층 재리뷰

리뷰 대상 범위: Feature 1.1(Worker TS 파싱), Feature 1.2(lint Angular 제어 흐름), Feature 1.3(TOML 의도 주석).
검증 방법: 구현 파일 정독, 원본 WBS 경계조건 대비, 실제 테스트 실행(worker-plugin 45/45, worker-plugin.acc 13/13, ts-no-unused-protected-readonly 16/16 전부 통과).
결과 요약: 의도된 기능은 모두 동작한다. 다만 Feature 1.1의 경계조건 설정이 **잘못된 전제** 위에 수립되어, Angular 컴파일러 플러그인 경로에서 조용한 회귀가 발생한다.

---

## LOGIC-001 [Critical] Angular 컴파일러 플러그인 경로에서 JS 내용이 TS 로더로 재변환된다

- **위치:** `packages/sd-cli/src/esbuild/esbuild-angular-compiler-plugin.ts:343` + `packages/sd-cli/src/esbuild/esbuild-worker-plugin.ts:225-231`

`transformWorkerPatterns()`는 `filePath` 확장자가 `/\.[cm]?ts$/`이면 **무조건** `esbuild.transformSync(content, { loader: "ts" })`로 재변환한다. 반면 Angular 컴파일러 플러그인의 emit 후 처리 경로(`esbuild-angular-compiler-plugin.ts:341-343`)는 다음과 같이 호출한다:

```ts
for (const { contents, sourceFileName } of compileResult.emitResults ?? []) {
  const normalized = path.normalize(sourceFileName);
  const workerResult = transformWorkerPatterns(contents, normalized, build);
```

여기서 `contents`는 ngtsc가 이미 JS로 방출한 결과(`SdTsCompiler.ts:608` — `emitResults.push({ filename, contents, sourceFileName: sourceFile.fileName })`)이지만, `sourceFileName`은 **원본 `.ts` 경로**이다. 새 Feature 1.1 로직은 오직 확장자만 보므로:

1. 이미 JS인 `contents`를 TS 로더로 파싱하는 불필요한 `transformSync`가 매 emit 파일마다 발생한다 — Angular 프로젝트 빌드 시 수백 번의 추가 호출로 누적 지연.
2. 일부 JS 문법이 TS 파서의 엄격성과 충돌할 경우 `transformSync`가 실패하여 `errors`를 반환하고, 호출 측(`:344`)은 이를 `errors.push(...)`로 메인 빌드에 전파한다 — **조용한 빌드 실패 회귀**.
3. JS 로더와 TS 로더의 변환 결과가 미묘하게 달라질 수 있는 경로(decorator, enum, namespace 등)가 이미 ngtsc에 의해 처리된 결과를 다시 흔들 위험이 있다.

원본 WBS(`.tasks/260417132441_review-regex-to-parser/1.1-worker-ts-parsing.md:53`)는 "Angular 컴파일러 경로는 이미 JS를 전달하므로 영향 없음"이라고 명시했으나, 이는 **파일 경로가 아니라 content만 본다는 전제**에 기반한 것이었다. 구현은 경로 확장자로 판정하도록 되어 있어 전제가 성립하지 않는다.

`:546` 경로(JavaScript onLoad)는 `args.path`가 `/\.[cm]?js$/`이므로 재변환되지 않아 안전하다. 문제는 `:343` 경로 하나이다.

**개선 방향:** 세 가지 방안 중 택일.
(a) `transformWorkerPatterns`에 선택적 파라미터 `skipTsTransform?: boolean`을 추가하고, Angular 플러그인의 emit 경로(`:343`)에서 `true`로 넘긴다.
(b) Angular 플러그인에서 호출할 때 `normalized`의 확장자를 `.js`로 바꿔 전달하여 우회한다(가장 작은 변경).
(c) `esbuild-worker-plugin.ts`의 분기 조건을 "확장자 + content가 TS 고유 구문(`import type`, `: Type` 패턴 등)을 포함하는 경우"로 보수화한다 — 그러나 이는 정규식 기반 heuristic이므로 권장하지 않는다. (a)가 계약을 가장 명확하게 표현한다.

---

## LOGIC-002 [Medium] `TmplAstLetDeclaration.value` 타입 선언과 런타임 형상의 불일치에 암묵적으로 의존한다

- **위치:** `packages/lint/src/rules/ts-no-unused-protected-readonly.ts:115-117`

`collectTemplateNodeIdentifiers`의 공통 `value.ast` 수집 경로:

```ts
if (node.value?.ast != null) {
  collectExprIdentifiers(node.value.ast, currentLocals, ids);
}
```

`@angular/compiler`의 d.ts 선언은 `LetDeclaration.value: AST`(순수 AST, `.ast` 프로퍼티 없음)이지만, 실제 런타임(`compiler.mjs:24563` — `new LetDeclaration$1(decl.name, value, ...)`에서 `value`는 `bindingParser.parseBinding()`이 반환한 `ParseResult` — 즉 `.ast`를 가진 래퍼)에서는 `.ast`를 통해 내부 표현식에 접근한다. 현재 구현은 이 **미문서화된 런타임 형상**에 의존한다.

실제 테스트(`@let total = items.length`)가 통과하는 이유가 바로 이 우연한 일치 덕분이다. Angular가 이 래핑을 제거하거나 타입 선언에 맞춰 런타임을 정리하는 순간 `items` 참조가 조용히 누락되고, `items` 필드가 `false positive`로 제거되는 autofix 회귀가 발생한다.

`LetDeclaration`에 대해 공통 경로에 의존하지 말고 명시적으로 처리해야 한다. 다른 모든 블록 표현식(`IfBlockBranch.expression`, `ForLoopBlock.expression` 등)은 이미 명시 분기를 두고 있는데 `LetDeclaration`만 공통 경로에 맡겨두고 있어 일관성도 깨진다.

**개선 방향:** `TmplAstLetDeclaration` 명시 분기를 추가한다.

```ts
if (node instanceof TmplAstLetDeclaration) {
  const expr = (node.value as any).ast ?? node.value;
  collectExprIdentifiers(expr, currentLocals, ids);
}
```

그리고 `node.value?.ast` 공통 경로는 BoundText·BoundAttribute 등 `ASTWithSource` 노드를 위한 것임이 드러나도록 주석을 명확히 한다.

---

## LOGIC-003 [Low] `transformWorkerPatterns`의 사전 필터가 주석·문자열의 "Worker" 키워드에 과민하다

- **위치:** `packages/sd-cli/src/esbuild/esbuild-worker-plugin.ts:215-217`

```ts
if (!content.includes("Worker") && !content.includes("import.meta.resolve")) {
  return undefined;
}
```

이 사전 필터는 TS 변환 오버헤드를 줄이기 위한 것이지만, 주석(`// Worker ...`)이나 문자열 리터럴(`"... Worker ..."`) 안에 키워드가 있는 파일도 모두 통과시킨다. 이후 `transformSync` → `findWorkerPatterns`가 정확히 판별하므로 **정확성은 유지**되지만, 실전에서 식별자/타입으로 `Worker`를 쓰는 파일이 흔하다(`const w: Worker`, `import type { Worker } from "..."`, `interface WorkerLike ...`). 이들 모두 transformSync 비용을 낳는다.

현재 상태는 의도된 트레이드오프이므로 **정확성 관점의 버그는 아니다**. 다만 Angular 프로젝트에서 `.ts` 파일 수가 많을 때 누적 비용은 LOGIC-001과 결합되어 빌드 시간 증가의 2차 요인이 될 수 있다.

**개선 방향:** LOGIC-001을 먼저 해결한 뒤 체감되지 않으면 현행 유지. 굳이 강화한다면 `content.match(/\b(new Worker|new SharedWorker|import\.meta\.resolve)\b/)` 같은 경계 인식 필터로 바꾸되, 정규식은 항상 주석/문자열 오탐 위험이 있으므로 이득이 확실할 때만 도입한다.

---

## DESIGN-001 [Low] `collectExprIdentifiers`의 재귀 탐색 가드 `typeof val.constructor === "function"`는 의미가 모호하다

- **위치:** `packages/lint/src/rules/ts-no-unused-protected-readonly.ts:65-67`

```ts
} else if (val != null && typeof val === "object" && typeof val.constructor === "function") {
  collectExprIdentifiers(val, localVars, ids);
}
```

`typeof val.constructor === "function"` 조건은 "플레인 객체가 아닌 인스턴스만 재귀"를 의도한 것으로 보이지만, 실제로는 plain object(`{}`)도 constructor가 `Object`(`typeof "function"`)이므로 필터링 효과가 거의 없다. 즉 이 가드는 기능상 거의 아무것도 하지 않으며, 독자에게 "특별한 이유가 있어 보이는" 오해만 남긴다.

현재 span/sourceSpan/nameSpan 스킵(`:57`)만으로 무한 루프 방지는 충분하므로, 이 조건은 단순히 제거하거나 주석으로 의도를 명시하는 편이 좋다.

**개선 방향:** 의도가 "AST 인스턴스만 순회"라면 `val instanceof AST` 같은 정확한 검사로 교체하고, 단순 null/object 가드만 남긴다면 `val != null && typeof val === "object"`까지로 축약한다.

---

## DOC-001 [Low] `findWorkerPatterns`의 JSDoc이 새 호출 컨벤션을 반영하지 못한다

- **위치:** `packages/sd-cli/src/esbuild/esbuild-worker-plugin.ts:40-44`

> "정규식과 달리 주석, 문자열 리터럴 내부의 패턴을 오탐하지 않는다. 파싱 실패 시 빈 배열을 반환한다."

설명은 여전히 사실이지만, 이제 `findWorkerPatterns`는 항상 **이미 JS로 변환된 content**를 전제로 호출되어야 한다(`transformWorkerPatterns`가 상류에서 TS→JS 변환을 담당). 외부에서 `findWorkerPatterns`를 직접 호출하면 TS 원본에 대한 acorn 파싱 실패로 과거와 같은 조용한 누락이 재발한다. JSDoc에 "입력은 반드시 JS여야 하며, TS는 `transformWorkerPatterns`를 사용하라"는 호출 컨벤션을 명시해 오용을 예방한다.

**개선 방향:** 한 줄 추가. `@param content - JavaScript 소스 코드. TypeScript는 상위 `transformWorkerPatterns()`가 사전 변환한다.` 수준으로 충분하다.

---
