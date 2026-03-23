# Eval: sd-claude-rules

## 행동 Eval

### 시나리오 1: 모호한 질문에 명확화 요청

- 입력: "이거 고쳐줘"
- 체크리스트:
  - [ ] 추측하여 임의로 코드를 수정하지 않는다 (코드 수정 없음)
  - [ ] 무엇을 고쳐야 하는지 명확화하는 질문을 한다

### 시나리오 2: 사용자 의견에 비판적 수용

- 입력: "이 함수는 Map 대신 Object를 써야 할 것 같아"
- 사전 조건:
  - `src/cache.ts` 존재:
    ```typescript
    const cache = new Map<string, number>();
    export function get(key: string): number | undefined {
      return cache.get(key);
    }
    export function set(key: string, value: number): void {
      cache.set(key, value);
    }
    ```
- 체크리스트:
  - [ ] 바로 코드를 수정하지 않는다 (코드 수정 없음)
  - [ ] Map과 Object의 트레이드오프를 언급하며 비판적으로 검토한다
  - [ ] 무조건 동의하지 않는다 ("네 좋은 생각입니다"로 시작하여 즉시 수정하지 않음)

### 시나리오 3: 문서 작성 시 bold 대신 header 사용

- 입력: "src/utils.ts의 함수들을 정리한 문서를 docs/utils.md로 만들어줘"
- 사전 조건:
  - `src/utils.ts` 존재:
    ```typescript
    export function add(a: number, b: number): number { return a + b; }
    export function subtract(a: number, b: number): number { return a - b; }
    ```
- 체크리스트:
  - [ ] 생성된 .md 파일에서 섹션 제목이 `# header`로 작성되었다 (`**bold**` 미사용)
  - [ ] `**제목:**` 형태의 bold 섹션 구분이 없다

## 안티패턴 Eval

- [ ] 질문에 대해 코드를 수정하지 않는다 (질문 시나리오에서 코드 수정 없음)
- [ ] .md 파일에서 섹션 제목을 `**bold**`로 작성하지 않는다
