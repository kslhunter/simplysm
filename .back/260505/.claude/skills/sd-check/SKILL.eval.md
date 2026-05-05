# Eval: sd-check

## 행동 Eval

### 시나리오 1: 스크립트 탐지 및 정상 실행

- 사전 조건:
  - `package.json`:
    ```json
    {
      "name": "eval-project",
      "scripts": {
        "typecheck": "echo Done",
        "lint": "echo Done",
        "test": "echo Done"
      }
    }
    ```
  - `pnpm-lock.yaml`: (빈 파일)
- 입력: "/sd-check"
- 체크리스트:
  - [ ] 텍스트 출력에 탐지된 스크립트 목록이 표시되며, typecheck·lint·test 3개 카테고리가 모두 포함되어 있다
  - [ ] pnpm-lock.yaml을 기반으로 패키지 매니저를 pnpm으로 감지했다 (텍스트 출력에 "pnpm" 언급)
  - [ ] .tmp/check/ 디렉토리에 출력 캡처 파일이 1개 이상 존재한다
  - [ ] 모든 검사가 통과하여 완료 메시지가 텍스트 출력에 포함되어 있다

### 시나리오 2: 타입체크 에러 감지 및 수정

- 사전 조건:
  - `package.json`:
    ```json
    {
      "name": "eval-project",
      "scripts": {
        "typecheck": "node check-type.js",
        "lint": "echo Done",
        "test": "echo Done"
      }
    }
    ```
  - `check-type.js`:
    ```javascript
    const fs = require("fs");
    const content = fs.readFileSync("src/app.ts", "utf8");
    if (content.includes('number = "hello"')) {
      console.log("src/app.ts(1,7): error TS2322: Type 'string' is not assignable to type 'number'.");
      process.exit(1);
    }
    console.log("Done in 0.5s");
    ```
  - `src/app.ts`:
    ```typescript
    const x: number = "hello";
    ```
- 입력: "/sd-check"
- 체크리스트:
  - [ ] .tmp/check/ 디렉토리의 출력 파일에 TS2322 에러 메시지가 기록되어 있다
  - [ ] src/app.ts가 수정되어 `number = "hello"` 패턴이 제거되었다
  - [ ] 텍스트 출력에 에러의 원인 분석 결과가 포함되어 있다 (살아남은 원인과 근거 요약 — sd-inner-debug 산출물)
  - [ ] 텍스트 출력에 해결 방안이 점수와 함께 제시되어 있다 (`sd-clarify` 형식의 선택지)
  - [ ] 수정 후 typecheck가 재실행되었다 (.tmp/check/에 typecheck 관련 출력 파일이 2개 이상 존재)

## 안티패턴 Eval

- [ ] check 명령어 결과가 .tmp/check/ 파일로 캡처되지 않았다 (파일 리다이렉트 없이 stdout으로만 처리)
- [ ] 에러 원인 분석 없이 코드를 수정했다 (텍스트 출력에서 원인 설명 없이 바로 수정 완료만 보고)
