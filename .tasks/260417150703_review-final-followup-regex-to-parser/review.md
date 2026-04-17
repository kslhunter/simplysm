# 코드 리뷰: regex-to-parser 2차 후속 수정(`.tasks/260417143009_review-followup-regex-to-parser/*`) 최종 심층 리뷰

리뷰 대상: 2차 후속(`.tasks/260417143009_review-followup-regex-to-parser/`)이 1차 후속 리뷰 5건(LOGIC-001 ~ DOC-001)을 정확히 해소했는지 검증.
검증 방법: WBS·Feature 설계·실제 구현 파일 정독 + 실행(전체 78건 통과 — worker-plugin spec 59건, ts-no-unused-protected-readonly spec 19건).
결과 요약: **1차 리뷰에서 지목된 5건 모두 설계대로 해소되었고 회귀 없다.** 잔여 이슈는 경미한 주석 참조 혼선(LOW) 하나와, 신규 사전 필터가 이론상 유발 가능한 미세한 false negative 시나리오(LOW) 하나뿐이다. Critical/Medium 없음.

구현 대응 매트릭스:

| 1차 리뷰 이슈                                                                 | 해소 위치                                                                 | 상태 |
|-------------------------------------------------------------------------------|---------------------------------------------------------------------------|------|
| LOGIC-001 [Critical] Angular 경로에서 JS가 TS 로더로 재변환                   | `esbuild-worker-plugin.ts:161-167, 222-227, 243` + `esbuild-angular-compiler-plugin.ts:345-347` | ✅ |
| LOGIC-002 [Medium] `LetDeclaration.value` 런타임 형상 암묵 의존              | `ts-no-unused-protected-readonly.ts:99-102, 123-125`                     | ✅ |
| LOGIC-003 [Low] 사전 필터가 `Worker` 키워드에 과민                           | `esbuild-worker-plugin.ts:231`                                           | ✅ |
| DESIGN-001 [Low] `typeof val.constructor === "function"` 가드 모호           | `ts-no-unused-protected-readonly.ts:65`                                  | ✅ |
| DOC-001 [Low] `findWorkerPatterns` JSDoc이 JS 전제 미반영                    | `esbuild-worker-plugin.ts:39-46`                                         | ✅ |

---

## DOC-002 [Low] 주석 속 "(D2)" 참조가 이번 WBS의 D2(사전 필터 강화)가 아니라 과거 Feature의 결정 번호를 가리킨다

- **위치:** `packages/sd-cli/src/esbuild/esbuild-worker-plugin.ts:218` 및 `packages/sd-cli/src/esbuild/esbuild-angular-compiler-plugin.ts:548`

두 주석:

```ts
// esbuild-worker-plugin.ts:216-218
/**
 * 파일 내용에서 Worker/SharedWorker 패턴을 감지하여 Worker 파일을 번들링하고
 * URL 경로를 번들된 파일 경로로 치환한다.
 *
 * Angular 플러그인 등 외부에서 직접 호출할 수 있도록 export한다 (D2).
 */
```

```ts
// esbuild-angular-compiler-plugin.ts:548
// Worker 패턴 처리 (D2)
```

두 `(D2)` 참조는 **1차 후속 Feature 1.1**(`.tasks/260417132441_review-regex-to-parser/1.1-worker-ts-parsing.md`)의 결정 번호이다. 그러나 현재 Feature 설계(`260417143009_.../1.1-worker-plugin-contract-and-filter.md`)의 D2는 "사전 필터 강화 방식"으로, **같은 기호가 서로 다른 결정을 가리킨다**. 새로 이 코드를 읽는 독자는 "(D2)"를 지금의 설계 문서에서 찾으려 들 것이고, 찾을 수 있는 D2는 사전 필터 이야기라 설명과 맞지 않아 혼란을 겪는다.

Feature 결정 번호(D1/D2/...)는 설계 문서 안에서만 유효한 로컬 식별자이므로, 프로덕션 코드의 주석에 남겨두면 시간이 지나면서 반드시 부패한다. 지금 이미 부패가 시작된 상태이다.

**개선 방향:** 결정 번호 참조를 제거하고 주석 자체가 의도를 설명하도록 고친다.

```ts
// esbuild-worker-plugin.ts:216-218
/**
 * 파일 내용에서 Worker/SharedWorker 패턴을 감지하여 Worker 파일을 번들링하고
 * URL 경로를 번들된 파일 경로로 치환한다.
 *
 * Angular 컴파일러 플러그인 등 외부에서 직접 호출한다.
 */
```

```ts
// esbuild-angular-compiler-plugin.ts:548
// Worker 패턴 처리
```

---

## LOGIC-004 [Low] 사전 필터 정규식이 `new` 와 `Worker` 사이의 주석을 허용하지 않아 이론상 조용한 누락이 가능하다

- **위치:** `packages/sd-cli/src/esbuild/esbuild-worker-plugin.ts:231`

```ts
if (!/\b(new\s+Worker|new\s+SharedWorker|import\.meta\.resolve)\b/.test(content)) {
  return undefined;
}
```

`\s+`는 공백 문자(공백, 탭, 개행 등)만 매치하므로 `new /* c */ Worker(...)`, `new // c\nWorker(...)` 같이 `new`와 `Worker` 사이에 주석이 끼어든 유효한 JS 호출은 사전 필터에서 탈락한다. 탈락하면 `findWorkerPatterns`가 호출되지 않아 Worker 번들이 생성되지 않고, 런타임에 `./worker.js`가 404로 실패한다 — **조용한 누락**.

실전에서 사람이 `new Worker(...)` 중간에 주석을 끼워 쓰는 경우는 거의 없고, 포매터(Prettier 등)가 이렇게 포매팅하는 일도 없으므로 실발생 가능성은 희박하다. 또한 정확성 보증은 원래 후속 AST 단계(`findWorkerPatterns`)의 몫이고 사전 필터는 비용 절감용이라는 설계 의도상 정규식을 더 복잡하게 만들 가치는 낮다. 다만 **"1차 후속 이전 상태 대비 사전 필터 때문에 놓치는 케이스가 새로 생겼다"**는 사실은 기록해둘 필요가 있다.

원래 필터(`content.includes("Worker")`)는 이 경우에도 단순 부분문자열 포함으로 통과시켰다. 즉 이번 강화로 인해 **정확성의 미세한 역행**이 발생한 것은 맞다.

**개선 방향:** 세 가지 중 택일, 또는 현행 유지.
(a) 현행 유지 — 실발생 가능성 희박, 복잡화 비용이 이득보다 큼.
(b) `\s+`를 주석 허용 토큰 시퀀스로 확장하되 정규식이 커질수록 유지보수 비용 증가. 권장하지 않음.
(c) 사전 필터를 완전히 제거하고 `findWorkerPatterns`만 호출 — `transformSync` + acorn 파싱 비용을 매 `.ts`/`.js` 파일에서 지불. 1차 수정의 원래 전제(사전 필터로 오버헤드 차단)와 모순.

가장 합리적인 선택은 **(a) 현행 유지 + 설계 문서에 이 케이스가 의도된 트레이드오프임을 한 줄 명시**이다.

---

## 추가 관찰 (버그 아님, 참고)

- **`collectExprIdentifiers` 배열 가드 일관성**(`ts-no-unused-protected-readonly.ts:59-63`)은 처음부터 `v.constructor` 체크가 없었고, 이번 DESIGN-001 개선으로 오브젝트 분기도 `val != null && typeof val === "object"`로 통일되어 두 분기의 가드가 동형이 되었다. 일관성 확보.
- **LetDeclaration self-reference** (`@let foo = foo + 1`)은 `:93-95`의 `currentLocals.add(node.name)`이 value 표현식 순회(`:99-102`) 전에 동작하므로 `foo`가 로컬로 인식되어 클래스 필드 참조로 수집되지 않는다. Angular가 문법적으로 금지하는 패턴이므로 실질 문제 없음(Feature 1.2 설계 주석 `:91-92`에서 언급됨).
- **테스트 커버리지**: 신규 `skipTsTransform 옵션` 6건 + `사전 필터 정규식 경계` 8건 + `@let 신규 3건` 모두 핵심 계약과 경계조건을 실증한다. 특히 계약 위반 시 조용한 누락(`skipTsTransform: true + import type`)을 명시적으로 테스트해둔 점은 장래 회귀 방지에 유효하다.

---

## 최종 평가

- **Critical/Medium 잔여 이슈 없음.**
- 잔여 LOW 2건은 (i) 주석 참조 혼선(DOC-002)과 (ii) 이론상 false negative(LOGIC-004) 로, 둘 다 수정은 선택적이다.
- DOC-002는 5분짜리 단순 정리로 즉시 고칠 가치가 있다. LOGIC-004는 현행 유지가 합리적이며 설계 메모로만 기록해두면 충분하다.
