# Eval: sd-debug

## 행동 Eval

### 시나리오 1: ACH 확정 + 방안 경쟁 — race condition

#### 사전 조건 파일

`src/cache.ts`:

```typescript
async function fetchData(key: string): Promise<string> {
  return new Promise((resolve) => setTimeout(() => resolve(`data-${key}`), 100));
}

class Cache {
  private data: Map<string, string> = new Map();
  private loading: Set<string> = new Set();

  async get(key: string): Promise<string> {
    if (this.data.has(key)) {
      return this.data.get(key)!;
    }

    if (this.loading.has(key)) {
      return this.data.get(key)!;
    }

    this.loading.add(key);
    const value = await fetchData(key);
    this.data.set(key, value);
    this.loading.delete(key);
    return value;
  }
}

const cache = new Cache();
Promise.all([cache.get("x"), cache.get("x")]).then(([a, b]) => {
  console.log(a, b);
});
```

- 입력: "/sd-debug cache.get을 동시에 호출하면 두 번째 호출이 undefined를 반환합니다"
- 체크리스트:
  - [ ] 출력에 가설이 2개 이상 나열되어 있다
  - [ ] 출력에 ACH 매트릭스(가설 x 증거, C/I/N 표시)가 포함되어 있다
  - [ ] 불일치(I)인 가설에 "폐기" 표시가 있다
  - [ ] loading 상태에서 data가 아직 없는데 get을 시도하는 것이 근본 원인임을 식별했다
  - [ ] 출력에 "확정" 판정이 포함되어 있다
  - [ ] 해결 방안이 2개 이상 제시되었다 (예: Promise 캐싱, 대기 큐 등)
  - [ ] 각 방안에 대해 독립적으로 채점 프로세스를 수행했다
  - [ ] 각 방안에 반론이 있다
  - [ ] 최고 점수 방안이 명시적으로 추천되었다
  - [ ] 방안 선택을 묻는 질문이 출력에 포함되었다
  - [ ] 선택 후 `.tasks/` 하위에 `*_debug-*/debug.md` 파일이 생성되었다
  - [ ] debug.md에 ACH 매트릭스가 포함되어 있다
  - [ ] 소스 코드 파일(src/cache.ts)이 수정되지 않았다

### 시나리오 2: 편법 금지 — 타이밍 이슈

#### 사전 조건 파일

`src/app.ts`:

```typescript
class DataLoader {
  private data: string[] | undefined;

  async init() {
    const response = await fetch("/api/data");
    this.data = await response.json();
  }

  getItems(): string[] {
    return this.data!;
  }
}

const loader = new DataLoader();
loader.init();
const items = loader.getItems();
console.log(items.length);
```

- 입력: "/sd-debug items가 undefined입니다. setTimeout(, 100) 감싸면 되긴 하는데 근본 원인이 뭘까요?"
- 체크리스트:
  - [ ] setTimeout을 해결 방안으로 제안하지 않았다
  - [ ] `init()`의 비동기 완료를 기다리지 않는 것이 근본 원인임을 식별했다
  - [ ] await 누락 또는 초기화 흐름 재설계 등 근본적 해결책을 제시했다
  - [ ] 방안 선택을 묻는 질문이 출력에 포함되었다

### 시나리오 3: 에러 그룹핑 — 같은 근본 원인의 여러 에러

#### 사전 조건 파일

`src/api.ts`:

```typescript
interface ApiResponse {
  status: number;
  data: {
    items: string[];
    total: number;
  };
}

async function fetchItems(): Promise<ApiResponse> {
  return { status: 200, data: { items: ["a", "b"], total: 2 } };
}

async function processItems() {
  const res = await fetchItems();
  const items = res.body.items;
  const total = res.body.total;
  const mapped = res.body.items.map((i: string) => i.toUpperCase());
  return { items, total, mapped };
}
```

- 입력: "/sd-debug processItems에서 3개 에러 발생: 1) res.body.items - body가 undefined 2) res.body.total - body가 undefined 3) res.body.items.map - cannot read properties of undefined. 전부 분석해주세요"
- 체크리스트:
  - [ ] 3개 에러가 같은 근본 원인(`body` 대신 `data`를 써야 함)에서 파생됨을 식별했다
  - [ ] 에러들을 하나의 그룹으로 묶어서 분석했다 (개별 3회가 아닌 1회 분석)
  - [ ] 해결 방안이 제시되었다
  - [ ] 방안 선택을 묻는 질문이 출력에 포함되었다

### 시나리오 4: ACH 프로세스 — 런타임 데이터 의존 버그

#### 사전 조건 파일

`src/order-service.ts`:

```typescript
interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  createdAt: string;
}

async function getOrder(orderId: string): Promise<Order> {
  const res = await fetch(`/api/orders/${orderId}`);
  if (!res.ok) throw new Error(`Order fetch failed: ${res.status}`);
  return res.json();
}

function calculateOrderTotal(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

async function processRefund(orderId: string) {
  const order = await getOrder(orderId);
  const total = calculateOrderTotal(order);
  const refundAmount = total * 0.9;
  await fetch(`/api/refunds`, {
    method: 'POST',
    body: JSON.stringify({ orderId, amount: refundAmount }),
  });
  return refundAmount;
}
```

- 입력: "/sd-debug processRefund에서 간헐적으로 refundAmount가 NaN이 됩니다. 특정 주문에서만 발생하고 대부분은 정상입니다. 어떤 주문이 문제인지는 아직 특정하지 못했습니다."
- 체크리스트:
  - [ ] 출력에 가설이 2개 이상 나열되어 있다 (예: quantity/unitPrice가 undefined, API 응답 스키마 불일치, items 필드 문제 등)
  - [ ] 출력에 ACH 매트릭스(가설 x 증거, C/I/N 표시)가 포함되어 있다
  - [ ] I(불일치)로 폐기된 가설이 있다면, 그 근거가 코드에서 직접 관찰 가능한 모순이다
  - [ ] 런타임 데이터(API 응답)를 직접 확인할 수 없다는 점이 분석에 반영되어 있다
  - [ ] 해결 방안이 2개 이상 제시되었다
  - [ ] 방안 선택을 묻는 질문이 출력에 포함되었다

## 안티패턴 Eval

- [ ] 소스 코드 파일(사전 조건 파일)이 수정되지 않았다
- [ ] 편법(setTimeout, try-catch로 에러 무시, 플래그 변수 우회)을 추천 방안으로 제안하지 않았다
- [ ] 원인 분석 없이 바로 해결책만 나열하지 않았다
- [ ] 방안 선택 질문 없이 바로 문서만 생성하지 않았다
- [ ] 가설을 1개만 세우고 바로 확정하지 않았다 (ACH 매트릭스 없이 단일 가설 확정)
