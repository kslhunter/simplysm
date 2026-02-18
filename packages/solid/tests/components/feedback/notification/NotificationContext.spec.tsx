import { describe, it, expect } from "vitest";
import { createRoot } from "solid-js";
import { render, waitFor } from "@solidjs/testing-library";
import { NotificationProvider } from "../../../../src/components/feedback/notification/NotificationProvider";
import { ConfigContext } from "../../../../src/providers/ConfigContext";
import {
  useNotification,
  type NotificationContextValue,
} from "../../../../src/components/feedback/notification/NotificationContext";

describe("NotificationContext", () => {
  describe("useNotification", () => {
    it("Provider 없이 사용하면 에러가 발생한다", () => {
      createRoot((dispose) => {
        expect(() => useNotification()).toThrow(
          "useNotification은 NotificationProvider 내부에서만 사용할 수 있습니다",
        );
        dispose();
      });
    });
  });
});

describe("NotificationProvider", () => {
  it("Provider 내에서 useNotification이 정상 동작한다", () => {
    let notification: NotificationContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    expect(notification!.items()).toEqual([]);
    expect(notification!.unreadCount()).toBe(0);
  });

  it("info 호출 시 알림이 추가된다", async () => {
    let notification: NotificationContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
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
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
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
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
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
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
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
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
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
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
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
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
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

  it("info 호출 시 생성된 알림의 id를 반환한다", async () => {
    let notification: NotificationContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
    ));

    const id = notification!.info("테스트 제목");

    await waitFor(() => {
      expect(typeof id).toBe("string");
      expect(notification!.items()[0].id).toBe(id);
    });
  });

  it("update 호출 시 알림 내용이 수정된다", async () => {
    let notification: NotificationContextValue;

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
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
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
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
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
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
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <NotificationProvider>
          {(() => {
            notification = useNotification();
            return null;
          })()}
        </NotificationProvider>
      </ConfigContext.Provider>
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
});
