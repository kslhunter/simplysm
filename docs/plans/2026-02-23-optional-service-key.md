# Optional ServiceClient Key Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** ServiceClient의 key와 SharedData의 serviceKey를 optional로 변경하여, 단일 연결 시 key 생략 가능하게 한다 (기본값 `"default"`).

**Architecture:** `ServiceClientContextValue` 인터페이스의 4개 메서드(connect, get, close, isConnected)에서 key를 optional로 변경하고 내부에서 `?? "default"` 처리. `SharedDataDefinition`의 serviceKey도 optional로 변경하고 SharedDataProvider 내부에서 동일하게 기본값 처리.

**Tech Stack:** TypeScript, SolidJS

---

### Task 1: ServiceClient key를 optional로 변경

**Files:**
- Modify: `packages/solid/src/providers/ServiceClientContext.ts:7-16`
- Modify: `packages/solid/src/providers/ServiceClientProvider.tsx:47-150`

**Step 1: ServiceClientContextValue 인터페이스 변경**

`packages/solid/src/providers/ServiceClientContext.ts` — key 파라미터를 전부 optional로:

```typescript
export interface ServiceClientContextValue {
  /** WebSocket 연결 열기 (key 생략 시 "default") */
  connect: (key?: string, options?: Partial<ServiceConnectionConfig>) => Promise<void>;
  /** 연결 닫기 */
  close: (key?: string) => Promise<void>;
  /** 연결된 클라이언트 인스턴스 가져오기 (연결되지 않은 key면 에러 발생) */
  get: (key?: string) => ServiceClient;
  /** 연결 상태 확인 */
  isConnected: (key?: string) => boolean;
}
```

**Step 2: ServiceClientProvider 구현부에서 기본값 적용**

`packages/solid/src/providers/ServiceClientProvider.tsx` — 4개 메서드의 시그니처와 내부에서 `key ?? "default"`:

```typescript
  const connect = async (
    key?: string,
    options?: Partial<ServiceConnectionConfig>,
  ): Promise<void> => {
    const resolvedKey = key ?? "default";
    // 이하 key → resolvedKey로 교체 (4곳: clientMap.has, clientMap.get, clientMap.set)
```

```typescript
  const close = async (key?: string): Promise<void> => {
    const resolvedKey = key ?? "default";
    const client = clientMap.get(resolvedKey);
    if (client) {
      await client.close();
      clientMap.delete(resolvedKey);
    }
  };
```

```typescript
  const get = (key?: string): ServiceClient => {
    const resolvedKey = key ?? "default";
    const client = clientMap.get(resolvedKey);
    if (!client) {
      throw new Error(`연결하지 않은 클라이언트 키입니다. ${resolvedKey}`);
    }
    return client;
  };
```

```typescript
  const isConnected = (key?: string): boolean => {
    const resolvedKey = key ?? "default";
    const client = clientMap.get(resolvedKey);
    return client?.connected ?? false;
  };
```

**Step 3: sd-check 실행**

Run: `npm run check packages/solid` (timeout: 600000)
Expected: 0 errors, 0 warnings

**Step 4: Commit**

```bash
git add packages/solid/src/providers/ServiceClientContext.ts packages/solid/src/providers/ServiceClientProvider.tsx
git commit -m "feat(solid): make ServiceClient key optional with default 'default'"
```

---

### Task 2: SharedDataDefinition serviceKey를 optional로 변경

**Files:**
- Modify: `packages/solid/src/providers/shared-data/SharedDataContext.ts:11`
- Modify: `packages/solid/src/providers/shared-data/SharedDataProvider.tsx:146,188`

**Step 1: SharedDataDefinition 인터페이스 변경**

`packages/solid/src/providers/shared-data/SharedDataContext.ts` — serviceKey를 optional로:

```typescript
  /** 서비스 연결 key (생략 시 "default") */
  serviceKey?: string;
```

**Step 2: SharedDataProvider에서 기본값 적용**

`packages/solid/src/providers/shared-data/SharedDataProvider.tsx` — `def.serviceKey` 사용하는 2곳:

line 146 (configure 내부):
```typescript
      const client = serviceClient.get(def.serviceKey ?? "default");
```

line 188 (onCleanup 내부):
```typescript
        const client = serviceClient.get(def.serviceKey ?? "default");
```

**Step 3: sd-check 실행**

Run: `npm run check packages/solid` (timeout: 600000)
Expected: 0 errors, 0 warnings

**Step 4: Commit**

```bash
git add packages/solid/src/providers/shared-data/SharedDataContext.ts packages/solid/src/providers/shared-data/SharedDataProvider.tsx
git commit -m "feat(solid): make SharedDataDefinition serviceKey optional with default 'default'"
```

---

### Task 3: 데모 페이지에서 key 제거

**Files:**
- Modify: `packages/solid-demo/src/pages/service/ServiceClientPage.tsx:29,38,39,47,60,71,82`
- Modify: `packages/solid-demo/src/pages/service/SharedDataPage.tsx:133,137,139,148,150,167,168`

**Step 1: ServiceClientPage에서 key 제거**

`packages/solid-demo/src/pages/service/ServiceClientPage.tsx` — 모든 `"main"` 제거:

```typescript
// line 29
await serviceClient.connect(undefined, { port: 40081 });

// line 38
if (serviceClient.isConnected()) {

// line 39
await serviceClient.close();

// lines 47, 60, 71, 82
const client = serviceClient.get();
```

**Step 2: SharedDataPage에서 key/serviceKey 제거**

`packages/solid-demo/src/pages/service/SharedDataPage.tsx`:

```typescript
// line 133
await serviceClient.connect(undefined, { port: 40081 });

// line 137: serviceKey: "main" 행 삭제

// line 139
const client = serviceClient.get();

// line 148: serviceKey: "main" 행 삭제

// line 150
const client = serviceClient.get();

// line 167
if (serviceClient.isConnected()) {

// line 168
await serviceClient.close();
```

**Step 3: sd-check 실행**

Run: `npm run check packages/solid-demo` (timeout: 600000)
Expected: 0 errors, 0 warnings

**Step 4: Commit**

```bash
git add packages/solid-demo/src/pages/service/ServiceClientPage.tsx packages/solid-demo/src/pages/service/SharedDataPage.tsx
git commit -m "refactor(solid-demo): remove explicit service key from demos"
```

---

### Task 4: 테스트에서 serviceKey 제거

**Files:**
- Modify: `packages/solid/tests/providers/shared-data/SharedDataProvider.spec.tsx:100,137,183,226,272,327`

**Step 1: 6개 테스트 케이스에서 serviceKey 행 삭제**

`packages/solid/tests/providers/shared-data/SharedDataProvider.spec.tsx` — 모든 `serviceKey: "main",` 행 삭제 (lines 100, 137, 183, 226, 272, 327).

**Step 2: sd-check 실행**

Run: `npm run check packages/solid` (timeout: 600000)
Expected: 0 errors, all tests pass

**Step 3: Commit**

```bash
git add packages/solid/tests/providers/shared-data/SharedDataProvider.spec.tsx
git commit -m "test(solid): remove explicit serviceKey from SharedData tests"
```

---

### Task 5: SharedDataProvider JSDoc 예제 업데이트

**Files:**
- Modify: `packages/solid/src/providers/shared-data/SharedDataProvider.tsx:35`

**Step 1: JSDoc에서 serviceKey 제거**

`packages/solid/src/providers/shared-data/SharedDataProvider.tsx` line 35:

```typescript
 * useSharedData().configure(() => ({
 *   users: {
 *     fetch: async (changeKeys) => fetchUsers(changeKeys),
 *     getKey: (item) => item.id,
 *     orderBy: [[(item) => item.name, "asc"]],
 *   },
 * }));
```

**Step 2: Commit**

```bash
git add packages/solid/src/providers/shared-data/SharedDataProvider.tsx
git commit -m "docs(solid): update SharedDataProvider example to omit serviceKey"
```
