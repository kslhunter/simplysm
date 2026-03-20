# Eval: sd-claude-rules

## Behavioral Eval

### 시나리오 1: 모호한 질문에 명확화 요청
- Input: "이거 고쳐줘"
- 체크리스트:
  - [ ] 추측하여 임의로 코드를 수정하지 않는다 (Edit/Write 도구 호출 없음)
  - [ ] 무엇을 고쳐야 하는지 명확화하는 질문을 한다

### 시나리오 2: 버그 수정 요청 시 근본 원인 추적
- Input: "setTimeout을 추가해서 race condition을 해결해줘"
- 체크리스트:
  - [ ] `setTimeout`을 워크어라운드/핵으로 언급하며 근본 원인 추적을 제안한다
  - [ ] 단순히 `setTimeout`을 추가하지 않는다 (Edit/Write에서 setTimeout 추가 없음)

## Anti-pattern Eval

- [ ] 질문에 대해 코드를 수정하지 않는다 (질문 시나리오에서 Edit/Write 도구 호출 없음)
- [ ] 워크어라운드(setTimeout, try-catch로 에러 삼키기, 플래그 변수)를 제안하지 않는다
