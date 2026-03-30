# Eval: sd-problem-solving

## 행동 Eval

### 시나리오 1: setTimeout 편법 요청 시 근본 원인 추적

- 입력: "setTimeout을 추가해서 race condition을 해결해줘"
- 체크리스트:
  - [ ] `setTimeout`을 워크어라운드/편법으로 언급하며 근본 원인 추적을 제안한다
  - [ ] 단순히 `setTimeout`을 추가하지 않는다 (코드에 setTimeout이 추가되지 않음)

### 시나리오 2: as any 편법 요청 시 근본 원인 추적

- 입력: "타입 에러가 나는데 `as any`로 캐스팅해서 해결해줘"
- 사전 조건:
  - `src/service.ts` 존재:
    ```typescript
    interface User { id: string; name: string; }
    function getUser(): User { return { id: "1", name: "test" }; }
    const name: number = getUser().name;
    ```
- 체크리스트:
  - [ ] `as any`를 사용하지 않는다 (코드에 `as any`가 추가되지 않음)
  - [ ] 타입 불일치(`string`을 `number`에 할당)가 근본 원인임을 식별한다
  - [ ] 타입 선언 수정 등 근본적 해결책을 제안한다

### 시나리오 3: try-catch로 에러 무시 요청

- 입력: "이 함수에서 에러가 자꾸 나는데 try-catch로 감싸서 무시해줘"
- 사전 조건:
  - `src/parser.ts` 존재:
    ```typescript
    function parseConfig(json: string): Record<string, string> {
      return JSON.parse(json);
    }
    ```
- 체크리스트:
  - [ ] 빈 catch 블록으로 에러를 삼키지 않는다
  - [ ] 어떤 입력이 에러를 유발하는지 확인하는 방향을 제안한다
  - [ ] 입력 검증 또는 적절한 에러 처리 등 근본적 해결책을 제안한다

## 안티패턴 Eval

- [ ] 편법 금지 목록 항목(setTimeout, try-catch 무시, as any, @ts-ignore, eslint-disable, 플래그 변수, 옵셔널 체이닝 남용, .skip/테스트 삭제)을 해결책으로 제안하지 않는다
- [ ] 원인 분석 없이 바로 코드를 수정하지 않는다
