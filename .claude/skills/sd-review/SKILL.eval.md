# Eval: sd-review

## 행동 Eval

### 시나리오 1: 로직 버그 탐지 및 리포트 형식

- 사전 조건:
  - `src/order-service.ts`:
    ```typescript
    export function calculateTotal(
      price: number,
      quantity: number,
      discountRate: number,
      taxRate: number,
    ): number {
      // 세금을 먼저 적용한 후 할인 (올바른 순서: 할인 후 세금)
      const taxed = price * quantity * (1 + taxRate);
      return taxed * (1 - discountRate);
    }

    export function createOrder(
      userId: string,
      items: { productId: string; quantity: number }[],
    ): { orderId: string; total: number } {
      const orderId = `ORD-${Date.now()}`;
      const total = items.reduce((sum, item) => sum + item.quantity * 100, 0);
      // DB에 주문 저장 (재고 차감 누락)
      saveToDatabase(orderId, userId, items, total);
      return { orderId, total };
    }

    function saveToDatabase(
      orderId: string,
      userId: string,
      items: { productId: string; quantity: number }[],
      total: number,
    ): void {
      // DB 저장 로직
    }
    ```
- 입력: "/sd-review"
- 체크리스트:
  - [ ] 가격 계산의 할인/세금 적용 순서 오류를 식별했다
  - [ ] 주문 생성에서 재고 차감 누락을 식별했다
  - [ ] 리포트 파일(`.tasks/` 하위)이 생성되었다
  - [ ] 각 이슈에 id, severity, category, location, title, description, suggestion 필드가 포함되었다
  - [ ] severity가 Critical/Medium/Low 중 하나로 지정되었다

### 시나리오 2: 경로 지정 범위 제한

- 사전 조건:
  - `src/data-loader.ts`:
    ```typescript
    export async function loadAllUsers(userIds: string[]): Promise<object[]> {
      const results: object[] = [];
      for (const id of userIds) {
        const user = await fetchUser(id); // N+1 쿼리 패턴
        results.push(user);
      }
      return results;
    }

    async function fetchUser(id: string): Promise<object> {
      // API 호출
      return {};
    }
    ```
  - `lib/calculator.ts`:
    ```typescript
    export function divide(a: number, b: number): number {
      return a / b; // 0으로 나누기 체크 없음
    }
    ```
- 입력: "/sd-review src/"
- 체크리스트:
  - [ ] `src/data-loader.ts`의 루프 내 반복 API 호출로 인한 성능 이슈를 식별했다
  - [ ] `lib/calculator.ts`의 이슈가 리포트에 포함되지 않았다
  - [ ] 리포트 파일이 생성되었다

### 시나리오 3: 린터 이슈 미보고

- 사전 조건:
  - `src/clean-logic.ts`:
    ```typescript
    export function greet(name: string): string {
      var greeting = "Hello";
      let unused = 42;
      if (name == "admin") {
        return greeting + " Admin!";
      }
      return greeting + " " + name + "!";
    }
    ```
- 입력: "/sd-review"
- 체크리스트:
  - [ ] `var` 사용, `==` 비교, 미사용 변수를 리뷰 이슈로 보고하지 않았다
  - [ ] 리포트에 "발견 이슈: 0건" 또는 "보고할 이슈가 없습니다"에 해당하는 내용이 있다

## 안티패턴 Eval

- [ ] 대상 소스 코드 파일을 직접 수정했다 (sd-review는 리포트만 생성해야 한다)
- [ ] 타입 불일치, any 사용, 코드 스타일 등 린터/타입체커가 잡는 이슈를 보고했다
- [ ] 확신 없는 이슈를 확정적으로 단정했다 ("반드시 ~를 일으킵니다" 등 단정적 표현)
