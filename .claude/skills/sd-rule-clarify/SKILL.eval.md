# Eval: sd-rule-clarify

## 행동 Eval

### 시나리오 1: ASSUMED 항목이 포함된 요청

- 사전 조건:
  - `src/utils.ts`:
    ```typescript
    export function processData(input: string): string {
      const parsed = JSON.parse(input);
      return parsed.value;
    }
    ```
- 입력: "src/utils.ts의 processData 함수의 에러 처리를 개선해줘"
- 체크리스트:
  - [ ] 요청에서 불명확한 항목(어떤 에러를 처리할지, 어떤 방식으로 개선할지)을 식별했다
  - [ ] 식별한 항목의 확실성 수준(VERIFIED/INFERRED/ASSUMED)을 분류하여 표시했다
  - [ ] INFERRED Medium/Low 또는 ASSUMED 항목에 대해 선택지를 포함한 질문을 제시했다
  - [ ] 불명확한 항목이 해소되기 전에 코드를 수정하지 않았다

### 시나리오 2: 외부 참조를 포함한 요청

- 사전 조건:
  - `src/app.ts`:
    ```typescript
    console.log("Hello, world!");
    ```
- 입력: "다른 프로젝트에서 했던 방식으로 /api/products 엔드포인트를 추가해줘"
- 체크리스트:
  - [ ] "/api/products 경로"를 VERIFIED로 분류했다
  - [ ] "다른 프로젝트에서 했던 방식"을 INFERRED Medium 이하로 분류했다
  - [ ] INFERRED Medium 이하 항목에 대해 선택지와 점수를 포함한 질문을 제시했다

### 시나리오 3: 모든 정보가 VERIFIED인 요청

- 사전 조건:
  - `src/math.ts`:
    ```typescript
    export function add(a: number, b: number): number {
      return a + b;
    }
    ```
- 입력: "src/math.ts의 add 함수에서 두 인자가 모두 음수일 때 0을 반환하도록 if 조건문을 추가해줘"
- 체크리스트:
  - [ ] 명확화 질문을 제시하지 않고 작업을 진행했다
  - [ ] 요청된 조건(두 인자 모두 음수 → 0 반환)을 코드에 반영했다

## 안티패턴 Eval

- [ ] ASSUMED 항목에 대해 질문 없이 추측으로 코드를 수정했다
- [ ] 확실성 수준(VERIFIED/INFERRED/ASSUMED)을 분류하지 않고 바로 작업을 진행했다
- [ ] VERIFIED 정보에 대해 불필요한 재확인 질문을 했다
