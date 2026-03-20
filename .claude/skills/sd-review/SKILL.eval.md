# Eval: sd-review

## 행동 Eval

### 시나리오 1: 다중 관점 로직 버그 탐지

**사전 조건 파일:**

`src/order-service.ts`:

```typescript
import { db } from "./db";
import { sendEmail } from "./mailer";

export class OrderService {
  async createOrder(userId: string, items: Array<{productId: string; quantity: number; price: number}>) {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.1;
    const discount = (subtotal + tax) * 0.2;
    const total = subtotal + tax - discount;

    const order = await db.query(
      "INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING id",
      [userId, total]
    );

    await sendEmail(userId, `주문 #${order.id} 완료`);

    return order;
  }

  async cancelOrder(orderId: string) {
    const order = await db.query("SELECT * FROM orders WHERE id = $1", [orderId]);
    await db.query("UPDATE orders SET status = 'cancelled' WHERE id = $1", [orderId]);
  }

  async getOrderSummary(userId: string) {
    const orders = await db.query("SELECT * FROM orders WHERE user_id = " + userId);

    let totalSpent = 0;
    for (const order of orders) {
      totalSpent = order.total;
    }

    return { userId, totalSpent, orderCount: orders.length };
  }
}
```

- 입력: "/sd-review src"
- 체크리스트:
  - [ ] `.tasks/` 하위에 `review.md` 파일이 생성되었다
  - [ ] `getOrderSummary`에서 `totalSpent = order.total`이 `+=`이어야 하는 할당 오류를 식별했다
  - [ ] `getOrderSummary`의 SQL Injection 취약점을 식별했다
  - [ ] `cancelOrder`에서 상태 미확인 취소 문제를 식별했다
  - [ ] `createOrder`의 재고/주문항목/계산 관련 이슈를 적어도 1건 발견했다 (재고 차감 누락, 주문 항목 미저장, 할인 계산 오류 중 하나 이상)
  - [ ] 각 이슈에 severity(Critical/Medium/Low)가 분류되어 있다
  - [ ] 각 이슈에 카테고리가 명시되어 있다

### 시나리오 2: 깔끔한 코드와 로직 버그 혼재

**사전 조건 파일:**

`src/formatter.ts`:

```typescript
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency }).format(amount);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
```

`src/pagination.ts`:

```typescript
/** page는 1부터 시작한다 (사용자에게 보여지는 페이지 번호) */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = page * pageSize;
  return items.slice(start, start + pageSize);
}

export function calculateAge(birthDate: Date): number {
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  return age;
}
```

- 입력: "/sd-review src"
- 체크리스트:
  - [ ] `src/formatter.ts`와 `src/pagination.ts` 모두 분석 대상에 포함했다
  - [ ] `paginate`에서 주석에 "page는 1부터 시작"이라 명시했는데 `page * pageSize`로 계산하는 의도-구현 불일치를 식별했다
  - [ ] `calculateAge`에서 생일이 아직 지나지 않은 경우를 고려하지 않는 로직 오류를 식별했다
  - [ ] `formatCurrency`와 `formatPercent`에 대해 불필요한 이슈를 생성하지 않았다

### 시나리오 3: 이슈 없는 깔끔한 코드

**사전 조건 파일:**

`src/calculator.ts`:

```typescript
export function add(a: number, b: number): number {
  return a + b;
}

export function subtract(a: number, b: number): number {
  return a - b;
}
```

- 입력: "/sd-review src"
- 체크리스트:
  - [ ] review.md가 생성되었다
  - [ ] 발견된 이슈가 없음을 명시했다
  - [ ] 거짓 양성 이슈를 만들어내지 않았다

## 안티패턴 Eval

- [ ] 코드를 직접 수정하지 않았다 (리포트만 생성)
- [ ] review.md 외에 소스 코드 파일을 변경하지 않았다
- [ ] 타입체커/린터가 잡을 수 있는 이슈(타입 누락, var 사용, == vs === 등)를 지적하지 않았다
- [ ] LLM이 탐지하기 어려운 영역(실제 런타임 성능 수치, race condition 등)을 확정적으로 단정하지 않았다
