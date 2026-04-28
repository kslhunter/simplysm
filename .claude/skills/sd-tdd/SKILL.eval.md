# Eval: sd-tdd

## 행동 Eval

### 시나리오 1: 정상 흐름 — Slice 1개(slugify) TDD

- 사전 조건:
    1. `.claude/skills/sd-tdd/eval-fixture/` 디렉토리 전체(`package.json`·`node_modules/`·`package-lock.json`)를 워크스페이스 시나리오 루트에 펼친다. fixture는 `vitest`·`typescript`·`@types/node`가 사전 install된 minimal Node 프로젝트이다.
    2. 시나리오 루트에 다음 추가 파일을 배치한다 (fixture에 없는 파일).

  `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "ESNext",
      "moduleResolution": "bundler",
      "esModuleInterop": true,
      "strict": true,
      "skipLibCheck": true,
      "verbatimModuleSyntax": true
    },
    "include": ["src/**/*", "tests/**/*"]
  }
  ```

  `vitest.config.ts`:
  ```ts
  import { defineConfig } from "vitest/config";

  export default defineConfig({
    test: {
      include: ["tests/**/*.spec.ts"],
    },
  });
  ```

  `src/string-utils/slugify.ts` (stub):
  ```ts
  export function slugify(text: string): string {
    throw new Error("not implemented");
  }
  ```

  `tasks/261225_slugify/wbs.md`:
  ````markdown
  # WBS: slugify 유틸리티

  ## 프로젝트 개요

  - **배경:** URL 슬러그 변환 유틸리티가 반복적으로 필요해 공용 함수로 추출한다.
  - **환경:** Node.js 20, TypeScript, Vitest.
  - **참조 자료:** 없음.

  ## 의존성 매트릭스

  | Task | 의존 대상 |
  |------|----------|
  | 1.1  | 없음     |

  ## USM Backbone

  ### Activity 1. 문자열 유틸리티

  #### [ ] Task 1.1 slugify 함수 구현

  **의존성:** 없음

  **Stories:**

  ##### Story 1.1.1 URL 슬러그 변환

  - 임의의 문자열을 받아 URL 슬러그(소문자, 하이픈 구분, ASCII 영숫자만)를 반환한다.
  ````

  `tasks/261225_slugify/tasks/1.1-slugify.md`:
  ````markdown
  # Task 1.1: slugify 함수 구현

  ## 참조 자료

  - @../wbs.md

  ## Story 명세

  ```gherkin
  Feature: slugify
    URL 슬러그 변환 유틸리티

    Rule: 영숫자만 남기고 공백은 하이픈으로 치환한다
      # 근거: 사용자 답변 "URL에 안전한 형식으로 변환"

      Scenario: 영문 + 공백 → 하이픈 변환
        Given 입력 문자열 "Hello World"
        When slugify를 호출하면
        Then 결과는 "hello-world" 이다

      Scenario: 특수문자 제거
        Given 입력 문자열 "Foo!Bar?Baz"
        When slugify를 호출하면
        Then 결과는 "foobarbaz" 이다
  ```

  ## 코드베이스 분석

  - `src/string-utils/slugify.ts:1` — `slugify(text: string): string` 시그니처의 stub. 본문은 `throw new Error("not implemented")`.
  - 기존 테스트 없음. 신규 테스트는 `tests/string-utils/`에 배치한다.
  - `vitest.config.ts:5` — 테스트 패턴 `tests/**/*.spec.ts`.

  ## 구현 설계

  ### 영향 범위

  - `src/string-utils/slugify.ts` — stub을 실제 구현으로 교체 [근거: 코드베이스 분석]
  - `tests/string-utils/slugify.acc.spec.ts` — Acceptance Test 신규 [근거: 테스트 디렉토리 패턴]
  - `tests/string-utils/slugify.spec.ts` — Unit Test 신규 [근거: 테스트 디렉토리 패턴]

  ### 설계 결정

  | 항목 | 결정 | 근거 유형 | 근거 |
  |------|------|-----------|------|
  | 변환 규칙 | (1) lowercase (2) 비-영숫자 중 공백은 `-`로 치환 (3) 그 외 비-영숫자 제거 (4) 연속 `-` 압축 (5) 양끝 `-` 제거 | WBS | Scenario 1·2 명세 |

  ## 구현 단위 (Story → Slice)

  ### [ ] Slice 1.1.1 slugify 변환 로직 구현

  - Scenarios: Feature `slugify` / Rule "영숫자만 남기고 공백은 하이픈으로 치환한다" / Scenario 1, 2

  ### Slice 의존성 매트릭스

  | Slice | 의존 대상 |
  |-------|----------|
  | 1.1.1 | 없음     |

  ### 수행 단계

  - 1단계: 1.1.1
  ````

- 입력: "/sd-tdd tasks/261225_slugify/tasks/1.1-slugify.md"

- 성공 행동:
    - [ ] 메인이 Slice를 subagent에 위임하여 구현하며, 메인이 `src/string-utils/slugify.ts`·테스트 파일을 직접 작성·수정하지 않는다.
    - [ ] `tests/string-utils/slugify.acc.spec.ts` 또는 동등 경로에 Acceptance Test 파일이 생성되고, slugify 함수를 import·호출하여 Story 명세의 두 Scenario(영문+공백 → 하이픈, 특수문자 제거)를 단언한다.
    - [ ] `tests/string-utils/slugify.spec.ts` 또는 동등 경로에 Unit Test 파일이 생성되고, Acceptance Test에 등장하지 않는 1개 이상의 추가 케이스(경계값·에러·빈 입력 등)를 단언한다.
    - [ ] `src/string-utils/slugify.ts`의 stub이 실제 구현으로 교체된다 (`throw new Error("not implemented")` 또는 빈 본문이 더 이상 남지 않는다).
    - [ ] Task 문서(`tasks/261225_slugify/tasks/1.1-slugify.md`)의 Slice 1.1.1 체크박스가 `[ ]` → `[x]`로 갱신된다.
    - [ ] WBS 문서(`tasks/261225_slugify/wbs.md`)의 Task 1.1 체크박스가 `[ ]` → `[x]`로 갱신된다.

- 보조 assertion:
    - [ ] Acceptance Test가 `readFileSync`·`fs.readFile`·`fs.promises.readFile`로 소스 파일을 문자열로 읽어 `toContain`/`toMatch`만 검증하지 않는다 (slugify를 import 후 실제 호출).
    - [ ] 메인 최종 응답에 누적 보고가 출력되거나(보고 항목이 1개 이상인 경우), 누적 보고 섹션 자체가 생략된다(보고 항목이 0개인 경우).

- Judge rubric:
    - PASS: subagent 위임을 통해 Acceptance Test와 Unit Test가 분리 작성되고, `src/string-utils/slugify.ts`가 실제 구현으로 교체되며, Slice·Task 체크박스가 모두 `[x]`로 갱신된다. 메인은 직접 코드 작성을 하지 않으며, 누적 보고는 항목 수에 맞게 출력 또는 생략된다.
    - FAIL: 메인이 구현·테스트 코드를 직접 작성한 흔적이 있다 / Acceptance Test 또는 Unit Test 파일이 생성되지 않았다 / slugify가 여전히 stub이다 / Slice 또는 Task 체크박스가 갱신되지 않았다 / Acceptance Test가 import 없이 소스 파일 문자열만 검증한다 — 중 하나라도 해당.

## 안티패턴 Eval

모든 시나리오에 공통으로 적용된다.

- [ ] subagent 위임 없이 메인이 직접 구현·테스트 코드를 작성하지 않는다.
- [ ] Acceptance Test 파일을 생성하지 않은 채 종료하지 않는다.
- [ ] Slice·Task 체크박스를 갱신하지 않은 채 종료하지 않는다.
- [ ] workspace 외부 경로(절대경로, `~/`, `cd ..` 등)의 파일을 읽거나 수정하지 않는다.
- [ ] AskUserQuestion 도구를 호출하지 않는다 — Eval 환경 규칙(`.claude/rules/sd-eval-env.md`)에 따라 텍스트 출력 + `**사용자 선택: {값}**` 고정 리터럴로 처리한다.
- [ ] subagent가 실제로 실패하지 않았는데 사용자에게 토론·결정을 요청하지 않는다.
