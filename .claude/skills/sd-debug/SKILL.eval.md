# Eval: sd-debug

## 행동 Eval

### 시나리오 1: 기본 디버깅 흐름 — 널 참조 에러

**사전 조건 파일:**

`src/user-service.ts`:

```typescript
interface User {
  id: string;
  email: string;
  profile?: {
    name: string;
    age: number;
  };
}

function getUsers(): User[] {
  return [
    { id: "1", email: "a@test.com", profile: { name: "Alice", age: 30 } },
    { id: "2", email: "b@test.com" },
  ];
}

function sendNewsletter() {
  const users = getUsers();
  for (const user of users) {
    console.log(`Sending to ${user.profile.name} <${user.email}>`);
  }
}
```

- 입력: "/sd-debug src/user-service.ts의 sendNewsletter 실행 시 TypeError: Cannot read properties of undefined (reading 'name') 에러가 발생합니다"
- 체크리스트:
  - [ ] `.tasks/` 하위에 `debug-*/debug.md` 파일이 생성되었다
  - [ ] 폴더명에 타임스탬프와 토픽이 포함되어 있다 (예: `{yyMMddHHmmss}_debug-{topic}/`)
  - [ ] `user.profile`이 `undefined`일 수 있다는 근본 원인을 식별했다
  - [ ] 원인 추적 과정(Why chain)이 포함되어 있다
  - [ ] 해결 방안이 2개 이상 제시되었다
  - [ ] 각 방안에 근본성/안전성/구현복잡도 점수(10점 만점)가 매겨져 있다
  - [ ] 각 방안에 반론(단점/리스크)이 명시되어 있다
  - [ ] 소스 코드 파일(사전 조건 파일)이 수정되지 않았다

### 시나리오 2: 편법 금지 검증 — 타이밍 이슈

**사전 조건 파일:**

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
  - [ ] debug.md가 생성되었다

### 시나리오 3: 다관점 방안 경쟁 — 여러 해결책이 가능한 코드 버그

**사전 조건 파일:**

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
      return this.data.get(key)!; // 이미 로딩 중이면 바로 반환 시도
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
  - [ ] loading 상태에서 data가 아직 없는데 get을 시도하는 것이 근본 원인임을 식별했다
  - [ ] 해결 방안이 2개 이상 제시되었다 (예: Promise 캐싱, 대기 큐, 뮤텍스 등)
  - [ ] 방안들 간에 점수 차이가 있다 (모두 동점이 아니다)
  - [ ] 각 방안에 반론이 있다
  - [ ] 최고 점수 방안이 명시적으로 추천되었다
  - [ ] debug.md가 생성되었다

## 안티패턴 Eval

- [ ] 소스 코드 파일(사전 조건 파일)이 수정되지 않았다
- [ ] 편법(setTimeout, try-catch로 에러 무시, 플래그 변수 우회)을 해결책으로 제안하지 않았다
- [ ] 원인 분석 없이 바로 해결책만 나열하지 않았다
- [ ] debug.md 외 파일을 변경하지 않았다
