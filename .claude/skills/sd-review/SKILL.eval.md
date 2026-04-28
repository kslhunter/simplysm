# Eval: sd-review

## 행동 Eval

### 시나리오 1: 로직 버그 탐지 및 보고 형식

- 사전 조건:
  - `src/order-service.ts`:
    ```typescript
    declare const db: { insert: (table: string, value: unknown) => void };

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
      items: { productId: string; quantity: number; price: number }[],
    ): { orderId: string; total: number } {
      const orderId = `ORD-${Date.now()}`;
      const total = items.reduce(
        (sum, item) => sum + calculateTotal(item.price, item.quantity, 0.1, 0.1),
        0,
      );
      // DB에 주문 저장 (재고 차감 누락)
      db.insert("orders", { orderId, userId, items, total });
      return { orderId, total };
    }
    ```
- 입력: "/sd-review"
- 성공 행동:
  - [ ] 가격 계산의 할인/세금 적용 순서 오류를 보고했다
  - [ ] 주문 생성에서 재고 차감 누락을 보고했다
  - [ ] 각 이슈에 위치(파일:라인), 카테고리, Severity가 명시되었다
- Judge rubric:
  - PASS: 두 이슈를 의미적으로 정확히 보고하고, 각 이슈가 위치·카테고리·Severity 정보와 함께 제시됨
  - FAIL: 두 이슈 중 하나라도 누락되거나, 위치/카테고리/Severity 중 하나라도 빠진 이슈가 있음

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
- 성공 행동:
  - [ ] `src/data-loader.ts`의 루프 내 반복 API 호출(N+1) 이슈를 보고했다
  - [ ] `lib/calculator.ts`의 이슈를 보고하지 않았다
- Judge rubric:
  - PASS: src/ 하위 이슈만 보고되고 lib/ 이슈는 언급되지 않음
  - FAIL: src/ 이슈 누락 또는 lib/ 이슈가 언급됨

### 시나리오 3: 린터 영역 이슈 미보고

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
- 성공 행동:
  - [ ] `var` 사용, `==` 비교, 미사용 변수를 리뷰 이슈로 보고하지 않았다
  - [ ] `확정 이슈 없음` 또는 동등한 의미의 종료 보고를 출력했다
- Judge rubric:
  - PASS: 린터 영역 항목이 이슈로 보고되지 않고, 확정 이슈 없음 종료 보고가 출력됨
  - FAIL: 린터 영역 항목이 이슈로 보고되거나, 종료 보고가 출력되지 않음

### 시나리오 4: 일관성 이슈 탐지

- 사전 조건:
  - `src/user-api.ts`:
    ```typescript
    export function getUser(userId: string): { id: string; name: string } {
      return { id: userId, name: "Alice" };
    }

    export function updateUser(name: string, uid: string): void {
      // userId vs uid 네이밍 불일치, 파라미터 순서 불일치
      console.log(name, uid);
    }

    export function deleteUser(userIdx: number): boolean {
      // userId(string) vs userIdx(number) 타입·네이밍 불일치
      return true;
    }
    ```
- 입력: "/sd-review"
- 성공 행동:
  - [ ] 사용자 식별자(`userId`/`uid`/`userIdx`)의 네이밍 불일치를 보고했다
  - [ ] 유사 함수 간 파라미터 순서 불일치를 보고했다
  - [ ] 해당 이슈의 카테고리가 일관성(CONSIST)로 분류되었다
- Judge rubric:
  - PASS: 두 일관성 이슈가 모두 보고되고 CONSIST 카테고리로 분류됨
  - FAIL: 둘 중 하나라도 누락되거나 CONSIST 외 카테고리로 분류됨

### 시나리오 5: 설계 이슈 탐지 (리소스 미해제)

- 사전 조건:
  - `src/event-manager.ts`:
    ```typescript
    export class EventManager {
      private handlers: Map<string, Function[]> = new Map();
      private cache: Map<string, object> = new Map();

      register(event: string, handler: Function): void {
        const list = this.handlers.get(event) ?? [];
        list.push(handler);
        this.handlers.set(event, list);
      }

      process(event: string, data: object): void {
        this.cache.set(`${event}-${Date.now()}`, data);
        // cache에 항목 추가만 하고 제거/초기화 없음 (무한 축적)
        const list = this.handlers.get(event) ?? [];
        for (const h of list) {
          h(data);
        }
      }
    }
    ```
- 입력: "/sd-review"
- 성공 행동:
  - [ ] cache Map의 무한 축적 패턴을 보고했다
  - [ ] 해당 이슈의 카테고리가 설계(DESIGN)로 분류되었다
- Judge rubric:
  - PASS: 무한 축적 이슈가 보고되고 DESIGN 카테고리로 분류됨
  - FAIL: 이슈 누락 또는 카테고리 오분류

## 안티패턴 Eval

- [ ] sd-review 실행 중 대상 소스 코드 파일을 직접 수정했다 (sd-review는 보고만 한다)
- [ ] `/sd-dev` 또는 다른 후속 수정 스킬을 호출했다 (sd-review는 보고 후 종료한다)
- [ ] `review.md` 등 별도 리뷰 산출물 파일을 생성했다
- [ ] 확신 없는 이슈를 단정적으로 표현했다 ("반드시 ~를 일으킵니다" 등)
