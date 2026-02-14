# Notification System 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 접근성을 고려한 Notification Center + Persist + Live Region 방식의 알림 시스템 구현

**Architecture:** NotificationContext로 전역 상태 관리, NotificationProvider가 상태와 Live Region 제공, NotificationBanner가 상단 배너, NotificationBell이 🔔 + Dropdown 조합

**Tech Stack:** SolidJS, Tailwind CSS, 기존 Dropdown/List/ListItem 컴포넌트

---

## Task 1: NotificationContext 타입 정의

**Files:**

- Create: `packages/solid/src/components/notification/NotificationContext.ts`
- Test: `packages/solid/tests/components/notification/NotificationContext.spec.ts`

**Step 1: 테스트 파일 생성**

```typescript
// packages/solid/tests/components/notification/NotificationContext.spec.ts
import { describe, it, expect } from "vitest";
import { createRoot } from "solid-js";
import { useNotification } from "../../../src/components/notification/NotificationContext";

describe("NotificationContext", () => {
  describe("useNotification", () => {
    it("Provider 없이 사용하면 에러가 발생한다", () => {
      createRoot((dispose) => {
        expect(() => useNotification()).toThrow("useNotification must be used within NotificationProvider");
        dispose();
      });
    });
  });
});
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `pnpm vitest packages/solid/tests/components/notification/NotificationContext.spec.ts --project=solid --run`
Expected: FAIL - 모듈이 존재하지 않음

**Step 3: Context 구현**

```typescript
// packages/solid/src/components/notification/NotificationContext.ts
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

export interface NotificationContextValue {
  // 상태
  items: Accessor<NotificationItem[]>;
  unreadCount: Accessor<number>;
  latestUnread: Accessor<NotificationItem | undefined>;

  // 알림 발생
  info: (title: string, message?: string, options?: NotificationOptions) => void;
  success: (title: string, message?: string, options?: NotificationOptions) => void;
  warning: (title: string, message?: string, options?: NotificationOptions) => void;
  danger: (title: string, message?: string, options?: NotificationOptions) => void;

  // 관리
  markAsRead: (id: string) => void;
  dismissBanner: () => void;
  clear: () => void;
}

export const NotificationContext = createContext<NotificationContextValue>();

export function useNotification(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
}
```

**Step 4: 테스트 실행하여 통과 확인**

Run: `pnpm vitest packages/solid/tests/components/notification/NotificationContext.spec.ts --project=solid --run`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/solid/src/components/notification/NotificationContext.ts packages/solid/tests/components/notification/NotificationContext.spec.ts
git commit -m "feat(solid): add NotificationContext with types"
```

---

## Task 2: NotificationProvider 구현

**Files:**

- Create: `packages/solid/src/components/notification/NotificationProvider.tsx`
- Modify: `packages/solid/tests/components/notification/NotificationContext.spec.ts`

**Step 1: Provider 테스트 추가**

```typescript
// packages/solid/tests/components/notification/NotificationContext.spec.ts 에 추가
import { render, waitFor } from "@solidjs/testing-library";
import { NotificationProvider } from "../../../src/components/notification/NotificationProvider";

describe("NotificationProvider", () => {
  it("Provider 내에서 useNotification이 정상 동작한다", () => {
    let notification: NotificationContextValue;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
      </NotificationProvider>
    ));

    expect(notification!.items()).toEqual([]);
    expect(notification!.unreadCount()).toBe(0);
  });

  it("info 호출 시 알림이 추가된다", async () => {
    let notification: NotificationContextValue;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
      </NotificationProvider>
    ));

    notification!.info("테스트 제목", "테스트 메시지");

    await waitFor(() => {
      expect(notification!.items().length).toBe(1);
      expect(notification!.items()[0].theme).toBe("info");
      expect(notification!.items()[0].title).toBe("테스트 제목");
      expect(notification!.items()[0].message).toBe("테스트 메시지");
      expect(notification!.unreadCount()).toBe(1);
    });
  });

  it("success/warning/danger 테마가 올바르게 적용된다", async () => {
    let notification: NotificationContextValue;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
      </NotificationProvider>
    ));

    notification!.success("성공", "성공 메시지");
    notification!.warning("경고", "경고 메시지");
    notification!.danger("에러", "에러 메시지");

    await waitFor(() => {
      const items = notification!.items();
      expect(items[0].theme).toBe("success");
      expect(items[1].theme).toBe("warning");
      expect(items[2].theme).toBe("danger");
    });
  });

  it("markAsRead 호출 시 해당 알림이 읽음 처리된다", async () => {
    let notification: NotificationContextValue;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
      </NotificationProvider>
    ));

    notification!.info("테스트", "메시지");

    await waitFor(() => {
      expect(notification!.unreadCount()).toBe(1);
    });

    const id = notification!.items()[0].id;
    notification!.markAsRead(id);

    await waitFor(() => {
      expect(notification!.unreadCount()).toBe(0);
      expect(notification!.items()[0].read).toBe(true);
    });
  });

  it("clear 호출 시 모든 알림이 삭제된다", async () => {
    let notification: NotificationContextValue;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
      </NotificationProvider>
    ));

    notification!.info("알림1");
    notification!.info("알림2");

    await waitFor(() => {
      expect(notification!.items().length).toBe(2);
    });

    notification!.clear();

    await waitFor(() => {
      expect(notification!.items().length).toBe(0);
    });
  });

  it("최대 50개까지만 알림을 유지한다", async () => {
    let notification: NotificationContextValue;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
      </NotificationProvider>
    ));

    // 51개 알림 추가
    for (let i = 0; i < 51; i++) {
      notification!.info(`알림 ${i}`);
    }

    await waitFor(() => {
      expect(notification!.items().length).toBe(50);
      // 첫 번째 알림이 삭제되고 마지막 알림이 유지
      expect(notification!.items()[49].title).toBe("알림 50");
    });
  });

  it("latestUnread가 가장 최신 읽지 않은 알림을 반환한다", async () => {
    let notification: NotificationContextValue;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
      </NotificationProvider>
    ));

    notification!.info("첫 번째");
    notification!.info("두 번째");

    await waitFor(() => {
      expect(notification!.latestUnread()?.title).toBe("두 번째");
    });
  });

  it("dismissBanner 호출 시 latestUnread가 undefined가 된다", async () => {
    let notification: NotificationContextValue;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
      </NotificationProvider>
    ));

    notification!.info("테스트");

    await waitFor(() => {
      expect(notification!.latestUnread()).toBeDefined();
    });

    notification!.dismissBanner();

    await waitFor(() => {
      expect(notification!.latestUnread()).toBeUndefined();
      // items에는 여전히 존재
      expect(notification!.items().length).toBe(1);
    });
  });
});
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `pnpm vitest packages/solid/tests/components/notification/NotificationContext.spec.ts --project=solid --run`
Expected: FAIL - NotificationProvider가 없음

**Step 3: Provider 구현**

```typescript
// packages/solid/src/components/notification/NotificationProvider.tsx
import { type ParentComponent, createSignal, createMemo } from "solid-js";
import {
  NotificationContext,
  type NotificationContextValue,
  type NotificationItem,
  type NotificationOptions,
  type NotificationTheme,
} from "./NotificationContext";

const MAX_ITEMS = 50;

export const NotificationProvider: ParentComponent = (props) => {
  const [items, setItems] = createSignal<NotificationItem[]>([]);
  const [dismissedBannerId, setDismissedBannerId] = createSignal<string | null>(null);

  const unreadCount = createMemo(() => items().filter((i) => !i.read).length);

  const latestUnread = createMemo(() => {
    const unreadItems = items().filter((i) => !i.read);
    const latest = unreadItems.at(-1);
    if (!latest) return undefined;
    return latest.id === dismissedBannerId() ? undefined : latest;
  });

  const addNotification = (
    theme: NotificationTheme,
    title: string,
    message?: string,
    options?: NotificationOptions
  ) => {
    const newItem: NotificationItem = {
      id: crypto.randomUUID(),
      theme,
      title,
      message,
      action: options?.action,
      createdAt: new Date(),
      read: false,
    };

    setItems((prev) => {
      const updated = [...prev, newItem];
      // 최대 개수 초과 시 오래된 것부터 삭제
      if (updated.length > MAX_ITEMS) {
        return updated.slice(-MAX_ITEMS);
      }
      return updated;
    });

    // 새 알림이 추가되면 dismissed 상태 초기화
    setDismissedBannerId(null);
  };

  const info = (title: string, message?: string, options?: NotificationOptions) => {
    addNotification("info", title, message, options);
  };

  const success = (title: string, message?: string, options?: NotificationOptions) => {
    addNotification("success", title, message, options);
  };

  const warning = (title: string, message?: string, options?: NotificationOptions) => {
    addNotification("warning", title, message, options);
  };

  const danger = (title: string, message?: string, options?: NotificationOptions) => {
    addNotification("danger", title, message, options);
  };

  const markAsRead = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
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
    markAsRead,
    dismissBanner,
    clear,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {props.children}
    </NotificationContext.Provider>
  );
};
```

**Step 4: 테스트 실행하여 통과 확인**

Run: `pnpm vitest packages/solid/tests/components/notification/NotificationContext.spec.ts --project=solid --run`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/solid/src/components/notification/NotificationProvider.tsx packages/solid/tests/components/notification/NotificationContext.spec.ts
git commit -m "feat(solid): add NotificationProvider with state management"
```

---

## Task 3: NotificationBanner 구현

**Files:**

- Create: `packages/solid/src/components/notification/NotificationBanner.tsx`
- Create: `packages/solid/tests/components/notification/NotificationBanner.spec.tsx`

**Step 1: 테스트 파일 생성**

```typescript
// packages/solid/tests/components/notification/NotificationBanner.spec.tsx
import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { NotificationProvider } from "../../../src/components/notification/NotificationProvider";
import { NotificationBanner } from "../../../src/components/notification/NotificationBanner";
import { useNotification } from "../../../src/components/notification/NotificationContext";

describe("NotificationBanner", () => {
  it("알림이 없으면 배너가 표시되지 않는다", () => {
    const { container } = render(() => (
      <NotificationProvider>
        <NotificationBanner />
      </NotificationProvider>
    ));

    expect(container.querySelector("[data-notification-banner]")).toBeNull();
  });

  it("알림이 있으면 배너가 표시된다", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
        <NotificationBanner />
      </NotificationProvider>
    ));

    notification!.info("테스트 제목", "테스트 메시지");

    await waitFor(() => {
      const banner = document.querySelector("[data-notification-banner]");
      expect(banner).not.toBeNull();
      expect(banner?.textContent).toContain("테스트 제목");
      expect(banner?.textContent).toContain("테스트 메시지");
    });
  });

  it("닫기 버튼 클릭 시 배너가 사라진다", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
        <NotificationBanner />
      </NotificationProvider>
    ));

    notification!.info("테스트");

    await waitFor(() => {
      expect(document.querySelector("[data-notification-banner]")).not.toBeNull();
    });

    const closeButton = document.querySelector("[data-notification-banner] [aria-label='알림 닫기']");
    fireEvent.click(closeButton!);

    await waitFor(() => {
      expect(document.querySelector("[data-notification-banner]")).toBeNull();
    });
  });

  it("role=alert 속성이 있다", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
        <NotificationBanner />
      </NotificationProvider>
    ));

    notification!.info("테스트");

    await waitFor(() => {
      const banner = document.querySelector("[data-notification-banner]");
      expect(banner?.getAttribute("role")).toBe("alert");
    });
  });

  it("테마별로 data-theme 속성이 설정된다", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
        <NotificationBanner />
      </NotificationProvider>
    ));

    notification!.danger("에러");

    await waitFor(() => {
      const banner = document.querySelector("[data-notification-banner]");
      expect(banner?.getAttribute("data-theme")).toBe("danger");
    });
  });

  it("action이 있으면 액션 버튼이 표시된다", async () => {
    let notification: ReturnType<typeof useNotification>;
    const handleAction = vi.fn();

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
        <NotificationBanner />
      </NotificationProvider>
    ));

    notification!.info("테스트", "메시지", {
      action: { label: "확인", onClick: handleAction },
    });

    await waitFor(() => {
      const actionButton = document.querySelector("[data-notification-banner] button:not([aria-label])");
      expect(actionButton?.textContent).toBe("확인");
    });

    const actionButton = document.querySelector("[data-notification-banner] button:not([aria-label])");
    fireEvent.click(actionButton!);

    expect(handleAction).toHaveBeenCalled();
  });

  it("새 알림이 오면 배너가 교체된다", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
        <NotificationBanner />
      </NotificationProvider>
    ));

    notification!.info("첫 번째");

    await waitFor(() => {
      expect(document.querySelector("[data-notification-banner]")?.textContent).toContain("첫 번째");
    });

    notification!.info("두 번째");

    await waitFor(() => {
      expect(document.querySelector("[data-notification-banner]")?.textContent).toContain("두 번째");
    });
  });
});
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `pnpm vitest packages/solid/tests/components/notification/NotificationBanner.spec.tsx --project=solid --run`
Expected: FAIL - NotificationBanner가 없음

**Step 3: Banner 구현**

```typescript
// packages/solid/src/components/notification/NotificationBanner.tsx
import { type Component, Show } from "solid-js";
import { Portal } from "solid-js/web";
import clsx from "clsx";
import { useNotification } from "./NotificationContext";

const baseClass = clsx(
  "fixed",
  "top-12", // var(--header-height) 대신 고정값 사용
  "left-0",
  "right-0",
  "z-50",
  "flex",
  "items-center",
  "justify-between",
  "gap-4",
  "px-4",
  "py-3",
  "text-white",
  "shadow-lg",
  "animate-slideDown",
  "motion-reduce:animate-none"
);

const themeClasses: Record<string, string> = {
  info: "bg-blue-600",
  success: "bg-green-600",
  warning: "bg-yellow-600",
  danger: "bg-red-600",
};

export const NotificationBanner: Component = () => {
  const notification = useNotification();

  const handleDismiss = () => {
    notification.dismissBanner();
  };

  const handleAction = () => {
    const latest = notification.latestUnread();
    latest?.action?.onClick();
  };

  return (
    <Show when={notification.latestUnread()}>
      {(item) => (
        <Portal>
          <div
            data-notification-banner
            data-theme={item().theme}
            role="alert"
            class={clsx(baseClass, themeClasses[item().theme])}
          >
            <div class="flex flex-col gap-0.5">
              <span class="font-semibold">{item().title}</span>
              <Show when={item().message}>
                <span class="text-sm opacity-90">{item().message}</span>
              </Show>
            </div>
            <div class="flex items-center gap-2">
              <Show when={item().action}>
                <button
                  type="button"
                  class="rounded bg-white/20 px-3 py-1 text-sm hover:bg-white/30"
                  onClick={handleAction}
                >
                  {item().action!.label}
                </button>
              </Show>
              <button
                type="button"
                aria-label="알림 닫기"
                class="rounded p-1 hover:bg-white/20"
                onClick={handleDismiss}
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </Portal>
      )}
    </Show>
  );
};
```

**Step 4: Tailwind 애니메이션 설정 추가**

`packages/solid/tailwind.config.ts`에 slideDown 애니메이션이 없으면 추가 필요. 확인 후 필요시 추가.

**Step 5: 테스트 실행하여 통과 확인**

Run: `pnpm vitest packages/solid/tests/components/notification/NotificationBanner.spec.tsx --project=solid --run`
Expected: PASS

**Step 6: 커밋**

```bash
git add packages/solid/src/components/notification/NotificationBanner.tsx packages/solid/tests/components/notification/NotificationBanner.spec.tsx
git commit -m "feat(solid): add NotificationBanner component"
```

---

## Task 4: NotificationBell 구현

**Files:**

- Create: `packages/solid/src/components/notification/NotificationBell.tsx`
- Create: `packages/solid/tests/components/notification/NotificationBell.spec.tsx`

**Step 1: 테스트 파일 생성**

```typescript
// packages/solid/tests/components/notification/NotificationBell.spec.tsx
import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NotificationProvider } from "../../../src/components/notification/NotificationProvider";
import { NotificationBell } from "../../../src/components/notification/NotificationBell";
import { useNotification } from "../../../src/components/notification/NotificationContext";

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.stubGlobal("innerWidth", 1024);
    vi.stubGlobal("innerHeight", 768);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("🔔 버튼이 렌더링된다", () => {
    const { container } = render(() => (
      <NotificationProvider>
        <NotificationBell />
      </NotificationProvider>
    ));

    expect(container.querySelector("[data-notification-bell]")).not.toBeNull();
  });

  it("알림이 없으면 뱃지가 표시되지 않는다", () => {
    render(() => (
      <NotificationProvider>
        <NotificationBell />
      </NotificationProvider>
    ));

    const badge = document.querySelector("[data-notification-badge]");
    expect(badge).toBeNull();
  });

  it("알림이 있으면 뱃지에 개수가 표시된다", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
        <NotificationBell />
      </NotificationProvider>
    ));

    notification!.info("알림1");
    notification!.info("알림2");

    await waitFor(() => {
      const badge = document.querySelector("[data-notification-badge]");
      expect(badge?.textContent).toBe("2");
    });
  });

  it("버튼 클릭 시 Dropdown이 열린다", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
        <NotificationBell />
      </NotificationProvider>
    ));

    notification!.info("테스트");

    const button = document.querySelector("[data-notification-bell]");
    fireEvent.click(button!);

    await waitFor(() => {
      const dropdown = document.querySelector("[data-dropdown]");
      expect(dropdown).not.toBeNull();
    });
  });

  it("Dropdown에 알림 목록이 표시된다", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
        <NotificationBell />
      </NotificationProvider>
    ));

    notification!.info("알림1", "메시지1");
    notification!.success("알림2", "메시지2");

    const button = document.querySelector("[data-notification-bell]");
    fireEvent.click(button!);

    await waitFor(() => {
      const dropdown = document.querySelector("[data-dropdown]");
      expect(dropdown?.textContent).toContain("알림1");
      expect(dropdown?.textContent).toContain("알림2");
    });
  });

  it("aria-label에 알림 개수가 포함된다", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
        <NotificationBell />
      </NotificationProvider>
    ));

    notification!.info("알림");

    await waitFor(() => {
      const button = document.querySelector("[data-notification-bell]");
      expect(button?.getAttribute("aria-label")).toContain("1");
    });
  });

  it("aria-haspopup과 aria-expanded가 올바르게 설정된다", async () => {
    render(() => (
      <NotificationProvider>
        <NotificationBell />
      </NotificationProvider>
    ));

    const button = document.querySelector("[data-notification-bell]");
    expect(button?.getAttribute("aria-haspopup")).toBe("true");
    expect(button?.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(button!);

    await waitFor(() => {
      expect(button?.getAttribute("aria-expanded")).toBe("true");
    });
  });

  it("알림 클릭 시 markAsRead가 호출된다", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
        <NotificationBell />
      </NotificationProvider>
    ));

    notification!.info("테스트");

    const button = document.querySelector("[data-notification-bell]");
    fireEvent.click(button!);

    await waitFor(() => {
      expect(document.querySelector("[data-dropdown]")).not.toBeNull();
    });

    const listItem = document.querySelector("[data-list-item]");
    fireEvent.click(listItem!);

    await waitFor(() => {
      expect(notification!.unreadCount()).toBe(0);
    });
  });

  it("전체 삭제 버튼 클릭 시 clear가 호출된다", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
        <NotificationBell />
      </NotificationProvider>
    ));

    notification!.info("알림1");
    notification!.info("알림2");

    const button = document.querySelector("[data-notification-bell]");
    fireEvent.click(button!);

    await waitFor(() => {
      expect(document.querySelector("[data-dropdown]")).not.toBeNull();
    });

    const clearButton = document.querySelector("[data-notification-clear]");
    fireEvent.click(clearButton!);

    await waitFor(() => {
      expect(notification!.items().length).toBe(0);
    });
  });
});
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `pnpm vitest packages/solid/tests/components/notification/NotificationBell.spec.tsx --project=solid --run`
Expected: FAIL - NotificationBell이 없음

**Step 3: Bell 구현**

```typescript
// packages/solid/src/components/notification/NotificationBell.tsx
import { type Component, createSignal, For, Show } from "solid-js";
import clsx from "clsx";
import { IconBell } from "@tabler/icons-solidjs";
import { useNotification } from "./NotificationContext";
import { Dropdown } from "../overlay/Dropdown";
import { List } from "../data/List";
import { ListItem } from "../data/ListItem";
import { Icon } from "../display/Icon";

const buttonClass = clsx(
  "relative",
  "p-2",
  "rounded-full",
  "hover:bg-gray-100",
  "dark:hover:bg-gray-800",
  "transition-colors",
  "focus:outline-none",
  "focus-visible:ring-2",
  "focus-visible:ring-primary-500"
);

const badgeClass = clsx(
  "absolute",
  "top-0",
  "right-0",
  "flex",
  "items-center",
  "justify-center",
  "min-w-5",
  "h-5",
  "px-1",
  "text-xs",
  "font-bold",
  "text-white",
  "bg-red-500",
  "rounded-full"
);

const themeIconColors: Record<string, string> = {
  info: "text-blue-500",
  success: "text-green-500",
  warning: "text-yellow-500",
  danger: "text-red-500",
};

export const NotificationBell: Component = () => {
  const notification = useNotification();
  const [open, setOpen] = createSignal(false);
  let buttonRef: HTMLButtonElement;

  const handleItemClick = (id: string) => {
    notification.markAsRead(id);
  };

  const handleClear = () => {
    notification.clear();
    setOpen(false);
  };

  return (
    <>
      <button
        ref={(el) => (buttonRef = el)}
        type="button"
        data-notification-bell
        class={buttonClass}
        aria-label={`알림 ${notification.unreadCount()}개`}
        aria-haspopup="true"
        aria-expanded={open()}
        onClick={() => setOpen(!open())}
      >
        <Icon icon={IconBell} size="1.25rem" />
        <Show when={notification.unreadCount() > 0}>
          <span data-notification-badge aria-hidden="true" class={badgeClass}>
            {notification.unreadCount()}
          </span>
        </Show>
      </button>

      <Dropdown
        triggerRef={() => buttonRef}
        open={open()}
        onOpenChange={setOpen}
        maxHeight={400}
        class="w-80"
      >
        <div class="p-2">
          <div class="mb-2 flex items-center justify-between px-2">
            <span class="font-semibold">알림</span>
            <Show when={notification.items().length > 0}>
              <button
                type="button"
                data-notification-clear
                class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                onClick={handleClear}
              >
                전체 삭제
              </button>
            </Show>
          </div>

          <Show
            when={notification.items().length > 0}
            fallback={
              <div class="py-8 text-center text-gray-500">알림이 없습니다</div>
            }
          >
            <List inset>
              <For each={[...notification.items()].reverse()}>
                {(item) => (
                  <ListItem
                    class={clsx(!item.read && "bg-primary-50 dark:bg-primary-900/10")}
                    onClick={() => handleItemClick(item.id)}
                  >
                    <div class="flex items-start gap-3">
                      <div class={clsx("mt-0.5", themeIconColors[item.theme])}>
                        <Icon icon={IconBell} size="1rem" />
                      </div>
                      <div class="flex-1">
                        <div class="font-medium">{item.title}</div>
                        <Show when={item.message}>
                          <div class="text-sm text-gray-600 dark:text-gray-400">
                            {item.message}
                          </div>
                        </Show>
                        <div class="mt-1 text-xs text-gray-400">
                          {item.createdAt.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </ListItem>
                )}
              </For>
            </List>
          </Show>
        </div>
      </Dropdown>
    </>
  );
};
```

**Step 4: 테스트 실행하여 통과 확인**

Run: `pnpm vitest packages/solid/tests/components/notification/NotificationBell.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/solid/src/components/notification/NotificationBell.tsx packages/solid/tests/components/notification/NotificationBell.spec.tsx
git commit -m "feat(solid): add NotificationBell component with Dropdown"
```

---

## Task 5: Live Region 추가 및 index.ts export

**Files:**

- Modify: `packages/solid/src/components/notification/NotificationProvider.tsx`
- Create: `packages/solid/src/components/notification/index.ts`
- Modify: `packages/solid/src/index.ts`
- Create: `packages/solid/tests/components/notification/LiveRegion.spec.tsx`

**Step 1: Live Region 테스트 추가**

```typescript
// packages/solid/tests/components/notification/LiveRegion.spec.tsx
import { render, waitFor } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { NotificationProvider } from "../../../src/components/notification/NotificationProvider";
import { useNotification } from "../../../src/components/notification/NotificationContext";

describe("Notification Live Region", () => {
  it("Provider에 role=status인 live region이 있다", () => {
    render(() => <NotificationProvider>content</NotificationProvider>);

    const liveRegion = document.querySelector('[role="status"][aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
  });

  it("알림 발생 시 live region 텍스트가 업데이트된다", async () => {
    let notification: ReturnType<typeof useNotification>;

    render(() => (
      <NotificationProvider>
        {(() => {
          notification = useNotification();
          return null;
        })()}
      </NotificationProvider>
    ));

    notification!.info("테스트 제목", "테스트 메시지");

    await waitFor(() => {
      const liveRegion = document.querySelector('[role="status"]');
      expect(liveRegion?.textContent).toContain("알림: 테스트 제목");
      expect(liveRegion?.textContent).toContain("테스트 메시지");
    });
  });

  it("live region은 시각적으로 숨겨져 있다 (sr-only)", () => {
    render(() => <NotificationProvider>content</NotificationProvider>);

    const liveRegion = document.querySelector('[role="status"]');
    expect(liveRegion?.classList.contains("sr-only")).toBe(true);
  });
});
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `pnpm vitest packages/solid/tests/components/notification/LiveRegion.spec.tsx --project=solid --run`
Expected: FAIL - live region이 없음

**Step 3: Provider에 Live Region 추가**

```typescript
// packages/solid/src/components/notification/NotificationProvider.tsx 수정
// return 문 수정:
return (
  <NotificationContext.Provider value={contextValue}>
    {/* 스크린 리더용 Live Region */}
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      class="sr-only"
    >
      <Show when={latestUnread()}>
        {(item) => `알림: ${item().title} ${item().message ?? ""}`}
      </Show>
    </div>
    {props.children}
  </NotificationContext.Provider>
);
```

**Step 4: 테스트 실행하여 통과 확인**

Run: `pnpm vitest packages/solid/tests/components/notification/LiveRegion.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: index.ts 생성**

```typescript
// packages/solid/src/components/notification/index.ts
export * from "./NotificationContext";
export * from "./NotificationProvider";
export * from "./NotificationBanner";
export * from "./NotificationBell";
```

**Step 6: 메인 index.ts에 export 추가**

```typescript
// packages/solid/src/index.ts 에 추가
export * from "./components/notification/NotificationContext";
export * from "./components/notification/NotificationProvider";
export * from "./components/notification/NotificationBanner";
export * from "./components/notification/NotificationBell";
```

**Step 7: 커밋**

```bash
git add packages/solid/src/components/notification/NotificationProvider.tsx packages/solid/src/components/notification/index.ts packages/solid/src/index.ts packages/solid/tests/components/notification/LiveRegion.spec.tsx
git commit -m "feat(solid): add Live Region for accessibility and export notification components"
```

---

## Task 6: 데모 페이지 추가

**Files:**

- Create: `packages/solid-demo/src/pages/feedback/NotificationPage.tsx`
- Modify: `packages/solid-demo/src/App.tsx` (라우트 추가)

**Step 1: 데모 페이지 구현**

```tsx
// packages/solid-demo/src/pages/feedback/NotificationPage.tsx
import { type Component } from "solid-js";
import {
  NotificationProvider,
  NotificationBanner,
  NotificationBell,
  useNotification,
  Button,
  Card,
} from "@simplysm/solid";

const NotificationDemo: Component = () => {
  const notification = useNotification();

  return (
    <div class="space-y-4">
      <Card>
        <h2 class="mb-4 text-lg font-semibold">알림 발생 테스트</h2>
        <div class="flex flex-wrap gap-2">
          <Button onClick={() => notification.info("정보", "일반 정보 알림입니다.")}>Info</Button>
          <Button onClick={() => notification.success("성공", "작업이 완료되었습니다.")}>Success</Button>
          <Button onClick={() => notification.warning("경고", "주의가 필요합니다.")}>Warning</Button>
          <Button onClick={() => notification.danger("에러", "오류가 발생했습니다.")}>Danger</Button>
        </div>
      </Card>

      <Card>
        <h2 class="mb-4 text-lg font-semibold">액션 버튼 포함</h2>
        <Button
          onClick={() =>
            notification.info("파일 업로드", "file.png 업로드 완료", {
              action: {
                label: "보기",
                onClick: () => alert("파일 보기 클릭!"),
              },
            })
          }
        >
          액션 포함 알림
        </Button>
      </Card>
    </div>
  );
};

export const NotificationPage: Component = () => {
  return (
    <NotificationProvider>
      <div class="min-h-screen">
        {/* 헤더 영역 */}
        <header class="sticky top-0 z-40 flex h-12 items-center justify-between border-b bg-white px-4 dark:bg-gray-900">
          <h1 class="text-lg font-bold">Notification Demo</h1>
          <NotificationBell />
        </header>

        {/* 배너 (헤더 아래) */}
        <NotificationBanner />

        {/* 콘텐츠 */}
        <main class="p-4">
          <NotificationDemo />
        </main>
      </div>
    </NotificationProvider>
  );
};
```

**Step 2: 라우트 추가**

App.tsx의 routes 배열에 추가:

```tsx
{ path: "/feedback/notification", component: lazy(() => import("./pages/feedback/NotificationPage").then(m => ({ default: m.NotificationPage }))) }
```

**Step 3: 수동 테스트**

Run: `pnpm watch solid solid-demo`
Navigate: http://localhost:40080/feedback/notification
Test: Info/Success/Warning/Danger 버튼 클릭하여 배너와 🔔 동작 확인

**Step 4: 커밋**

```bash
git add packages/solid-demo/src/pages/feedback/NotificationPage.tsx packages/solid-demo/src/App.tsx
git commit -m "feat(solid-demo): add Notification demo page"
```

---

## Task 7: 전체 테스트 및 린트 확인

**Step 1: 전체 테스트 실행**

Run: `pnpm vitest --project=solid --run`
Expected: 모든 테스트 PASS

**Step 2: 린트 확인**

Run: `pnpm lint packages/solid`
Expected: 에러 없음

**Step 3: 타입체크 확인**

Run: `pnpm typecheck packages/solid`
Expected: 에러 없음

**Step 4: 최종 커밋 (필요시)**

린트/타입 에러 수정 후 커밋

---

## 요약

| Task | 파일                     | 설명                    |
| ---- | ------------------------ | ----------------------- |
| 1    | NotificationContext.ts   | Context + 타입 정의     |
| 2    | NotificationProvider.tsx | 상태 관리 + 알림 메서드 |
| 3    | NotificationBanner.tsx   | 상단 슬라이드 배너      |
| 4    | NotificationBell.tsx     | 🔔 버튼 + Dropdown      |
| 5    | index.ts + Live Region   | 접근성 + export         |
| 6    | Demo page                | 동작 확인용 데모        |
| 7    | 테스트/린트              | 품질 검증               |
