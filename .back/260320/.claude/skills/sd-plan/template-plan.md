# 구현 계획: 주문 취소

## Spec

- Source: .tasks/260318143000_order-cancel/spec.md

## Contracts

```typescript
interface CancelResult {
  success: boolean;
  refundMethod?: "card" | "point";
  message: string;
}

interface OrderCancelService {
  canCancel(orderId: string): Promise<boolean>;
  cancel(orderId: string): Promise<CancelResult>;
}

interface RefundService {
  refund(orderId: string, method: "card" | "point"): Promise<void>;
}
```

## Slices

### Slice 1: 취소 가능 여부 판정

- Files: `src/order/can-cancel.ts` (new), `src/order/can-cancel.spec.ts` (new)
- Contract: `canCancel(orderId: string): Promise<boolean>`
- Depends on: none

### Slice 2: 환불 처리

- Files: `src/payment/refund.service.ts` (modify), `src/payment/refund.service.spec.ts` (modify)
- Contract: `refund(orderId: string, method: "card" | "point"): Promise<void>`
- Depends on: none

### Slice 3: 취소 API 엔드포인트

- Files: `src/order/order.controller.ts` (modify), `src/order/order.controller.spec.ts` (modify)
- Contract: `cancel(orderId: string): Promise<CancelResult>`
- Depends on: Slice 1, Slice 2

## Verification List

- [ ] `canCancel`: 결제완료 상태 → true — Slice 1
- [ ] `canCancel`: 배송중 상태 → false — Slice 1
- [ ] `canCancel`: 취소됨 상태 → false — Slice 1
- [ ] `refund`: 카드 결제 → 카드사 환불 API 호출 확인 — Slice 2
- [ ] `refund`: 포인트 결제 → 포인트 즉시 복원 확인 — Slice 2
- [ ] `cancel`: 취소 가능 주문 → canCancel + refund + 상태변경 통합 — Slice 3
- [ ] `cancel`: 취소 불가 주문 → 에러 메시지 반환 — Slice 3
