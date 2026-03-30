# Eval: sd-check

## 행동 Eval

### 시나리오 1: typecheck 에러 → sd-debug 분석 → 수정 → 재실행
- 입력: "/sd-check"
- 사전 조건:
  - `pnpm-lock.yaml` (빈 파일)
  - `package.json`:
    ```json
    { "name": "@simplysm/eval-check", "scripts": { "typecheck": "node scripts/typecheck.js" } }
    ```
  - `scripts/typecheck.js`:
    ```js
    const fs = require("fs");
    const content = fs.readFileSync("src/calc.ts", "utf-8");
    if (content.includes('"hello"')) {
      console.error("src/calc.ts(4,24): error TS2322: Type 'string' is not assignable to type 'number'.");
      process.exit(1);
    }
    console.log("typecheck passed");
    ```
  - `src/calc.ts`:
    ```ts
    export function add(a: number, b: number): number {
      return a + b;
    }
    const result: number = "hello";
    ```
- 체크리스트:
  - [ ] typecheck 명령어를 실행했다
  - [ ] 에러 발생 후 sd-debug의 분석 프로세스(Why Chain, 다관점 방안 채점)를 수행했다
  - [ ] 수정 방안 선택지를 제시했다
  - [ ] 선택된 방안에 따라 src/calc.ts를 수정했다
  - [ ] 수정 후 typecheck를 재실행했다

### 시나리오 2: 전체 흐름 — 순서 + lint --fix + 결과 보고
- 입력: "/sd-check"
- 사전 조건:
  - `pnpm-lock.yaml` (빈 파일)
  - `package.json`:
    ```json
    { "name": "@simplysm/eval-check", "scripts": { "typecheck": "node scripts/typecheck.js", "lint": "node scripts/lint.js", "test": "node scripts/test.js" } }
    ```
  - `scripts/typecheck.js`: `console.log("typecheck passed");`
  - `scripts/lint.js`: `console.log("lint passed");`
  - `scripts/test.js`: `console.log("test passed");`
- 체크리스트:
  - [ ] typecheck, lint, test 3개 스크립트를 탐지하여 표시했다
  - [ ] typecheck → lint → test 순서로 실행했다
  - [ ] lint 실행 시 `--fix` 플래그가 포함된 명령어를 사용했다
  - [ ] 각 Check의 상태와 반복 횟수를 포함하는 결과 보고가 출력되었다

### 시나리오 3: 스크립트 미탐지 → 사용자 질문
- 입력: "/sd-check"
- 사전 조건:
  - `pnpm-lock.yaml` (빈 파일)
  - `package.json`: `{ "name": "@simplysm/eval-check", "scripts": { "build": "echo build" } }`
- 체크리스트:
  - [ ] 탐지된 check 스크립트가 없다는 내용이 출력되었다
  - [ ] 사용자에게 실행할 명령어를 묻는 질문이 출력에 포함되었다

## 안티패턴 Eval

- [ ] typecheck 통과 전에 lint나 test를 먼저 실행했다
- [ ] 에러 발생 시 sd-debug 분석 프로세스 없이 직접 수정했다
- [ ] 탐지 결과를 사용자에게 표시하지 않고 바로 실행으로 넘어갔다
