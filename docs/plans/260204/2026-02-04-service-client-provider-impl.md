# ServiceClientProvider 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Angular 레거시 `sd-service-client-factory.provider.ts`를 SolidJS Context + Provider 패턴으로 마이그레이션

**Architecture:** NotificationProvider에 update/remove/renotify 기능 추가 후, ServiceClientProvider에서 이를 활용하여 progress 표시. 멀티 클라이언트 지원(key 기반), location 기반 기본값 사용.

**Tech Stack:** SolidJS, @simplysm/service-client

---

## Task 1: NotificationContext 타입 확장

**Files:**

- Modify: `packages/solid/src/components/notification/NotificationContext.ts`
- Test: `packages/solid/tests/components/notification/NotificationContext.spec.tsx`

**Step 1: 테스트 작성 - info()가 id를 반환하는지 확인**

`packages/solid/tests/components/notification/NotificationContext.spec.tsx` 끝에 추가:

```tsx
it("info 호출 시 생성된 알림의 id를 반환한다", async () => {
  let notification: NotificationContextValue;

  render(() => (
    <NotificationProvider>
      {(() => {
        notification = useNotification();
        return null;
      })()}
    </NotificationProvider>
  ));

  const id = notification!.info("테스트 제목");

  await waitFor(() => {
    expect(typeof id).toBe("string");
    expect(notification!.items()[0].id).toBe(id);
  });
});
```

**Step 2: 테스트 실행 - 실패 확인**

```bash
pnpm vitest packages/solid/tests/components/notification/NotificationContext.spec.tsx --project=solid --run
```

Expected: FAIL - info()가 void를 반환하므로 id가 undefined

**Step 3: NotificationContext 타입 수정**

`packages/solid/src/components/notification/NotificationContext.ts`:

```typescript
import { createContext, useContext, type Accessor } from "solid-js";

export type NotificationTheme = "info" | "success" | "warning" | "danger";

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface NotificationItem {
  id: string;
  theme: NotificationTheme;
  title: string;
  message?: string;
  action?: NotificationAction;
  createdAt: Date;
  read: boolean;
}

export interface NotificationOptions {
  action?: NotificationAction;
}

export interface NotificationUpdateOptions {
  renotify?: boolean;
}

export interface NotificationContextValue {
  // 상태
  items: Accessor<NotificationItem[]>;
  unreadCount: Accessor<number>;
  latestUnread: Accessor<NotificationItem | undefined>;

  // 알림 발생 (id 반환)
  info: (title: string, message?: string, options?: NotificationOptions) => string;
  success: (title: string, message?: string, options?: NotificationOptions) => string;
  warning: (title: string, message?: string, options?: NotificationOptions) => string;
  danger: (title: string, message?: string, options?: NotificationOptions) => string;

  // 알림 수정
  update: (
    id: string,
    updates: Partial<Pick<NotificationItem, "title" | "message" | "theme" | "action">>,
    options?: NotificationUpdateOptions,
  ) => void;

  // 알림 삭제
  remove: (id: string) => void;

  // 관리
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissBanner: () => void;
  clear: () => void;
}

export const NotificationContext = createContext<NotificationContextValue>();

export function useNotification(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification은 NotificationProvider 내부에서만 사용할 수 있습니다");
  }
  return context;
}
```

**Step 4: 테스트 실행 - 타입 에러 확인**

```bash
pnpm typecheck packages/solid
```

Expected: FAIL - NotificationProvider에서 타입 불일치

---

## Task 2: NotificationProvider 구현 수정

**Files:**

- Modify: `packages/solid/src/components/notification/NotificationProvider.tsx`
- Test: `packages/solid/tests/components/notification/NotificationContext.spec.tsx`

**Step 1: NotificationProvider 수정 - id 반환 및 update/remove 구현**

`packages/solid/src/components/notification/NotificationProvider.tsx`:

```tsx
import { type ParentComponent, createSignal, createMemo, Show } from "solid-js";
import {
  NotificationContext,
  type NotificationContextValue,
  type NotificationItem,
  type NotificationOptions,
  type NotificationTheme,
  type NotificationUpdateOptions,
} from "./NotificationContext";

const MAX_ITEMS = 50;

export const NotificationProvider: ParentComponent = (props) => {
  const [items, setItems] = createSignal<NotificationItem[]>([]);
  const [dismissedBannerId, setDismissedBannerId] = createSignal<string | null>(null);

  const unreadItems = createMemo(() => items().filter((i) => !i.read));
  const unreadCount = createMemo(() => unreadItems().length);

  const latestUnread = createMemo(() => {
    const latest = unreadItems().at(-1);
    if (!latest) return undefined;
    return latest.id === dismissedBannerId() ? undefined : latest;
  });

  const addNotification = (
    theme: NotificationTheme,
    title: string,
    message?: string,
    options?: NotificationOptions,
  ): string => {
    const id = crypto.randomUUID();
    const newItem: NotificationItem = {
      id,
      theme,
      title,
      message,
      action: options?.action,
      createdAt: new Date(),
      read: false,
    };

    setItems((prev) => {
      const updated = [...prev, newItem];
      if (updated.length > MAX_ITEMS) {
        return updated.slice(-MAX_ITEMS);
      }
      return updated;
    });

    setDismissedBannerId(null);
    return id;
  };

  const info = (title: string, message?: string, options?: NotificationOptions): string => {
    return addNotification("info", title, message, options);
  };

  const success = (title: string, message?: string, options?: NotificationOptions): string => {
    return addNotification("success", title, message, options);
  };

  const warning = (title: string, message?: string, options?: NotificationOptions): string => {
    return addNotification("warning", title, message, options);
  };

  const danger = (title: string, message?: string, options?: NotificationOptions): string => {
    return addNotification("danger", title, message, options);
  };

  const update = (
    id: string,
    updates: Partial<Pick<NotificationItem, "title" | "message" | "theme" | "action">>,
    options?: NotificationUpdateOptions,
  ): void => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, ...updates };

        // renotify: 읽은 상태면 다시 읽지 않음으로 변경
        if (options?.renotify && item.read) {
          updated.read = false;
          // 배너가 dismiss된 상태에서 renotify되면 다시 보이게
          setDismissedBannerId(null);
        }

        return updated;
      }),
    );
  };

  const remove = (id: string): void => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const markAsRead = (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
  };

  const markAllAsRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const dismissBanner = () => {
    const latest = latestUnread();
    if (latest) {
      setDismissedBannerId(latest.id);
    }
  };

  const clear = () => {
    setItems([]);
    setDismissedBannerId(null);
  };

  const contextValue: NotificationContextValue = {
    items,
    unreadCount,
    latestUnread,
    info,
    success,
    warning,
    danger,
    update,
    remove,
    markAsRead,
    markAllAsRead,
    dismissBanner,
    clear,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {/* 스크린 리더용 Live Region */}
      <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
        <Show when={latestUnread()}>{(item) => `알림: ${item().title} ${item().message ?? ""}`}</Show>
      </div>
      {props.children}
    </NotificationContext.Provider>
  );
};
```

**Step 2: 타입체크 실행**

```bash
pnpm typecheck packages/solid
```

Expected: PASS

**Step 3: 기존 테스트 실행**

```bash
pnpm vitest packages/solid/tests/components/notification/NotificationContext.spec.tsx --project=solid --run
```

Expected: PASS (10 tests)

**Step 4: 커밋**

```bash
git add packages/solid/src/components/notification/NotificationContext.ts packages/solid/src/components/notification/NotificationProvider.tsx packages/solid/tests/components/notification/NotificationContext.spec.tsx
git commit -m "feat(solid): NotificationProvider에 update, remove 메서드 및 id 반환 추가"
```

---

## Task 3: update/remove/renotify 테스트 추가

**Files:**

- Test: `packages/solid/tests/components/notification/NotificationContext.spec.tsx`

**Step 1: update 테스트 작성**

`packages/solid/tests/components/notification/NotificationContext.spec.tsx` 끝에 추가:

```tsx
it("update 호출 시 알림 내용이 수정된다", async () => {
  let notification: NotificationContextValue;

  render(() => (
    <NotificationProvider>
      {(() => {
        notification = useNotification();
        return null;
      })()}
    </NotificationProvider>
  ));

  const id = notification!.info("원래 제목", "원래 메시지");

  notification!.update(id, { title: "수정된 제목", message: "수정된 메시지" });

  await waitFor(() => {
    const item = notification!.items()[0];
    expect(item.title).toBe("수정된 제목");
    expect(item.message).toBe("수정된 메시지");
  });
});

it("remove 호출 시 알림이 삭제된다", async () => {
  let notification: NotificationContextValue;

  render(() => (
    <NotificationProvider>
      {(() => {
        notification = useNotification();
        return null;
      })()}
    </NotificationProvider>
  ));

  const id = notification!.info("삭제될 알림");
  notification!.info("유지될 알림");

  await waitFor(() => {
    expect(notification!.items().length).toBe(2);
  });

  notification!.remove(id);

  await waitFor(() => {
    expect(notification!.items().length).toBe(1);
    expect(notification!.items()[0].title).toBe("유지될 알림");
  });
});

it("update with renotify: 읽은 알림이 다시 읽지 않음으로 변경된다", async () => {
  let notification: NotificationContextValue;

  render(() => (
    <NotificationProvider>
      {(() => {
        notification = useNotification();
        return null;
      })()}
    </NotificationProvider>
  ));

  const id = notification!.info("알림");
  notification!.markAsRead(id);

  await waitFor(() => {
    expect(notification!.unreadCount()).toBe(0);
  });

  notification!.update(id, { message: "완료!" }, { renotify: true });

  await waitFor(() => {
    expect(notification!.unreadCount()).toBe(1);
    expect(notification!.items()[0].read).toBe(false);
  });
});

it("update with renotify: 읽지 않은 알림은 그대로 읽지 않음 상태 유지", async () => {
  let notification: NotificationContextValue;

  render(() => (
    <NotificationProvider>
      {(() => {
        notification = useNotification();
        return null;
      })()}
    </NotificationProvider>
  ));

  const id = notification!.info("알림");

  await waitFor(() => {
    expect(notification!.unreadCount()).toBe(1);
  });

  notification!.update(id, { message: "업데이트" }, { renotify: true });

  await waitFor(() => {
    // 여전히 1개 (증가하지 않음)
    expect(notification!.unreadCount()).toBe(1);
  });
});
```

**Step 2: 테스트 실행**

```bash
pnpm vitest packages/solid/tests/components/notification/NotificationContext.spec.tsx --project=solid --run
```

Expected: PASS (14 tests)

**Step 3: 커밋**

```bash
git add packages/solid/tests/components/notification/NotificationContext.spec.tsx
git commit -m "test(solid): NotificationProvider update/remove/renotify 테스트 추가"
```

---

## Task 4: ServiceClientContext 생성

**Files:**

- Create: `packages/solid/src/contexts/ServiceClientContext.ts`
- Test: `packages/solid/tests/contexts/ServiceClientContext.spec.tsx`

**Step 1: 테스트 파일 생성**

`packages/solid/tests/contexts/ServiceClientContext.spec.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { createRoot } from "solid-js";
import { useServiceClient } from "../../../src/contexts/ServiceClientContext";

describe("ServiceClientContext", () => {
  describe("useServiceClient", () => {
    it("Provider 없이 사용하면 에러가 발생한다", () => {
      createRoot((dispose) => {
        expect(() => useServiceClient()).toThrow(
          "useServiceClient는 ServiceClientProvider 내부에서만 사용할 수 있습니다",
        );
        dispose();
      });
    });
  });
});
```

**Step 2: 테스트 실행 - 실패 확인**

```bash
pnpm vitest packages/solid/tests/contexts/ServiceClientContext.spec.tsx --project=solid --run
```

Expected: FAIL - 모듈이 없음

**Step 3: ServiceClientContext 생성**

`packages/solid/src/contexts/ServiceClientContext.ts`:

```typescript
import { createContext, useContext } from "solid-js";
import type { ServiceClient, ServiceConnectionConfig } from "@simplysm/service-client";

export interface ServiceClientContextValue {
  connect: (key: string, options?: Partial<ServiceConnectionConfig>) => Promise<void>;
  close: (key: string) => Promise<void>;
  get: (key: string) => ServiceClient;
  isConnected: (key: string) => boolean;
}

export const ServiceClientContext = createContext<ServiceClientContextValue>();

export function useServiceClient(): ServiceClientContextValue {
  const context = useContext(ServiceClientContext);
  if (!context) {
    throw new Error("useServiceClient는 ServiceClientProvider 내부에서만 사용할 수 있습니다");
  }
  return context;
}
```

**Step 4: 테스트 실행**

```bash
pnpm vitest packages/solid/tests/contexts/ServiceClientContext.spec.tsx --project=solid --run
```

Expected: PASS (1 test)

**Step 5: 커밋**

```bash
git add packages/solid/src/contexts/ServiceClientContext.ts packages/solid/tests/contexts/ServiceClientContext.spec.tsx
git commit -m "feat(solid): ServiceClientContext 및 useServiceClient 훅 생성"
```

---

## Task 5: ServiceClientProvider 생성

**Files:**

- Create: `packages/solid/src/contexts/ServiceClientProvider.tsx`
- Modify: `packages/solid/tests/contexts/ServiceClientContext.spec.tsx`

**Step 1: Provider 테스트 추가**

`packages/solid/tests/contexts/ServiceClientContext.spec.tsx` 끝에 추가:

```tsx
import { render } from "@solidjs/testing-library";
import { ServiceClientProvider } from "../../../src/contexts/ServiceClientProvider";
import { NotificationProvider } from "../../../src/components/notification/NotificationProvider";
import { ConfigContext } from "../../../src/contexts/ConfigContext";
import type { ServiceClientContextValue } from "../../../src/contexts/ServiceClientContext";

describe("ServiceClientProvider", () => {
  it("Provider 내에서 useServiceClient가 정상 동작한다", () => {
    let serviceClient: ServiceClientContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          <ServiceClientProvider>
            {(() => {
              serviceClient = useServiceClient();
              return null;
            })()}
          </ServiceClientProvider>
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    expect(serviceClient!).toBeDefined();
    expect(typeof serviceClient!.connect).toBe("function");
    expect(typeof serviceClient!.close).toBe("function");
    expect(typeof serviceClient!.get).toBe("function");
    expect(typeof serviceClient!.isConnected).toBe("function");
  });

  it("연결하지 않은 키로 get 호출 시 에러가 발생한다", () => {
    let serviceClient: ServiceClientContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          <ServiceClientProvider>
            {(() => {
              serviceClient = useServiceClient();
              return null;
            })()}
          </ServiceClientProvider>
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    expect(() => serviceClient!.get("unknown")).toThrow("연결하지 않은 클라이언트 키입니다. unknown");
  });

  it("연결하지 않은 키로 isConnected 호출 시 false를 반환한다", () => {
    let serviceClient: ServiceClientContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          <ServiceClientProvider>
            {(() => {
              serviceClient = useServiceClient();
              return null;
            })()}
          </ServiceClientProvider>
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    expect(serviceClient!.isConnected("unknown")).toBe(false);
  });
});
```

**Step 2: 테스트 실행 - 실패 확인**

```bash
pnpm vitest packages/solid/tests/contexts/ServiceClientContext.spec.tsx --project=solid --run
```

Expected: FAIL - ServiceClientProvider 모듈 없음

**Step 3: ServiceClientProvider 생성**

`packages/solid/src/contexts/ServiceClientProvider.tsx`:

```tsx
import { type ParentComponent, onCleanup } from "solid-js";
import { ServiceClient, type ServiceConnectionConfig } from "@simplysm/service-client";
import { ServiceClientContext, type ServiceClientContextValue } from "./ServiceClientContext";
import { useConfig } from "./ConfigContext";
import { useNotification } from "../components/notification/NotificationContext";

export const ServiceClientProvider: ParentComponent = (props) => {
  const config = useConfig();
  const notification = useNotification();

  const clientMap = new Map<string, ServiceClient>();
  const reqProgressMap = new Map<string, string>();
  const resProgressMap = new Map<string, string>();

  onCleanup(async () => {
    for (const client of clientMap.values()) {
      await client.close();
    }
    clientMap.clear();
  });

  const connect = async (key: string, options?: Partial<ServiceConnectionConfig>): Promise<void> => {
    if (clientMap.has(key)) {
      const existing = clientMap.get(key)!;
      if (!existing.connected) {
        throw new Error("이미 연결이 끊긴 클라이언트와 같은 키로 연결을 시도하였습니다.");
      } else {
        throw new Error("이미 연결된 클라이언트와 같은 키로 연결을 시도하였습니다.");
      }
    }

    const defaultConfig: ServiceConnectionConfig = {
      host: location.hostname,
      port: Number(location.port) || (location.protocol.startsWith("https") ? 443 : 80),
      ssl: location.protocol.startsWith("https"),
    };

    const client = new ServiceClient(config.clientName, {
      ...defaultConfig,
      ...options,
    });

    // 요청 진행률 이벤트
    client.on("request-progress", (state) => {
      const existing = reqProgressMap.get(state.uuid);

      if (!existing) {
        const id = notification.info("요청을 전송하는 중입니다.", "0%");
        reqProgressMap.set(state.uuid, id);
      } else {
        const percent = Math.round((state.completedSize / state.totalSize) * 100);
        notification.update(existing, { message: `${percent}%` });
      }

      if (state.completedSize === state.totalSize) {
        const id = reqProgressMap.get(state.uuid);
        if (id) {
          notification.update(
            id,
            {
              title: "요청 전송 완료",
              message: "100%",
            },
            { renotify: true },
          );
          reqProgressMap.delete(state.uuid);
        }
      }
    });

    // 응답 진행률 이벤트
    client.on("response-progress", (state) => {
      const existing = resProgressMap.get(state.uuid);

      if (!existing) {
        const id = notification.info("응답을 전송받는 중입니다.", "0%");
        resProgressMap.set(state.uuid, id);
      } else {
        const percent = Math.round((state.completedSize / state.totalSize) * 100);
        notification.update(existing, { message: `${percent}%` });
      }

      if (state.completedSize === state.totalSize) {
        const id = resProgressMap.get(state.uuid);
        if (id) {
          notification.update(
            id,
            {
              title: "응답 전송 완료",
              message: "100%",
            },
            { renotify: true },
          );
          resProgressMap.delete(state.uuid);
        }
      }
    });

    await client.connect();
    clientMap.set(key, client);
  };

  const close = async (key: string): Promise<void> => {
    const client = clientMap.get(key);
    if (client) {
      await client.close();
      clientMap.delete(key);
    }
  };

  const get = (key: string): ServiceClient => {
    const client = clientMap.get(key);
    if (!client) {
      throw new Error(`연결하지 않은 클라이언트 키입니다. ${key}`);
    }
    return client;
  };

  const isConnected = (key: string): boolean => {
    const client = clientMap.get(key);
    return client?.connected ?? false;
  };

  const contextValue: ServiceClientContextValue = {
    connect,
    close,
    get,
    isConnected,
  };

  return <ServiceClientContext.Provider value={contextValue}>{props.children}</ServiceClientContext.Provider>;
};
```

**Step 4: 테스트 실행**

```bash
pnpm vitest packages/solid/tests/contexts/ServiceClientContext.spec.tsx --project=solid --run
```

Expected: PASS (4 tests)

**Step 5: 타입체크**

```bash
pnpm typecheck packages/solid
```

Expected: PASS

**Step 6: 커밋**

```bash
git add packages/solid/src/contexts/ServiceClientProvider.tsx packages/solid/tests/contexts/ServiceClientContext.spec.tsx
git commit -m "feat(solid): ServiceClientProvider 생성"
```

---

## Task 6: Export 추가 및 전체 테스트

**Files:**

- Modify: `packages/solid/src/index.ts`

**Step 1: index.ts에 export 추가**

`packages/solid/src/index.ts` 끝에 추가:

```typescript
export * from "./contexts/ServiceClientContext";
export * from "./contexts/ServiceClientProvider";
```

**Step 2: 전체 타입체크**

```bash
pnpm typecheck packages/solid
```

Expected: PASS

**Step 3: 전체 테스트 실행**

```bash
pnpm vitest --project=solid --run
```

Expected: PASS (모든 테스트)

**Step 4: 린트**

```bash
pnpm lint packages/solid --fix
```

Expected: PASS

**Step 5: 커밋**

```bash
git add packages/solid/src/index.ts
git commit -m "feat(solid): ServiceClientContext 및 ServiceClientProvider export 추가"
```

---

## 검증 체크리스트

- [ ] `pnpm typecheck packages/solid` 통과
- [ ] `pnpm vitest --project=solid --run` 모든 테스트 통과
- [ ] `pnpm lint packages/solid` 통과
- [ ] NotificationProvider: info/success/warning/danger가 id 반환
- [ ] NotificationProvider: update() 동작
- [ ] NotificationProvider: remove() 동작
- [ ] NotificationProvider: renotify 옵션 동작
- [ ] ServiceClientProvider: connect/close/get/isConnected 동작
- [ ] ServiceClientProvider: progress 표시 동작
