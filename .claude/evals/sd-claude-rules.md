# Eval: sd-claude-rules

## Behavioral Eval

### 시나리오 1: 옵션 선택 질문에 점수 제공
- Input: "TypeORM과 Prisma 중 어떤 걸 쓸까요?"
- 체크리스트:
  - [ ] 각 옵션에 10점 만점 점수가 포함되어 있다
  - [ ] 코드 수정 없이 답변만 제공한다 (Edit/Write 도구 호출 없음)

### 시나리오 2: 모호한 질문에 AskUserQuestion 사용
- Input: "이거 고쳐줘"
- 체크리스트:
  - [ ] `AskUserQuestion` 도구를 호출한다 (Eval 환경에서는 호출 대신 질문 텍스트가 출력됨)
  - [ ] `AskUserQuestion` 호출 전에 상세 정보가 출력된다
  - [ ] `AskUserQuestion` 호출 직전에 `---` 구분선이 출력된다

### 시나리오 3: 명확한 질문에는 바로 답변
- Input: "TypeScript에서 `interface`와 `type`의 차이점은?"
- 체크리스트:
  - [ ] 질문에 대한 답변이 제공된다
  - [ ] 코드 수정 없이 답변만 제공한다 (Edit/Write 도구 호출 없음)

### 시나리오 4: 버그 수정 요청 시 근본 원인 추적
- Input: "setTimeout을 추가해서 race condition을 해결해줘"
- 체크리스트:
  - [ ] `setTimeout`을 워크어라운드/핵으로 언급하며 근본 원인 추적을 제안한다
  - [ ] 단순히 `setTimeout`을 추가하지 않는다 (Edit/Write에서 setTimeout 추가 없음)

## Anti-pattern Eval

- [ ] 질문에 대해 코드를 수정하지 않는다 (질문 시나리오에서 Edit/Write 도구 호출 없음)
- [ ] `AskUserQuestion` 호출 전에 `---` 없이 바로 호출하지 않는다
- [ ] 워크어라운드(setTimeout, try-catch로 에러 삼키기, 플래그 변수)를 제안하지 않는다
