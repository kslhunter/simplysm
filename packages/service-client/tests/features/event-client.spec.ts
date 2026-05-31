import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEventClient, type EventClient } from "../../src/features/event-client";
import type { ServiceTransport } from "../../src/transport/service-transport";
import { defineEvent } from "@simplysm/service-common";
import { EventEmitter } from "@simplysm/core-common";

/** 테스트용 이벤트 정의 (소비앱에서는 공통 패키지에서 import) */
const TestEvent = defineEvent<{ channel: string }, string>("TestEvent");

/** ServiceTransport 최소 모의 객체 */
function createMockTransport(): ServiceTransport & { triggerEvent(keys: string[], data: unknown): void } {
  const emitter = new EventEmitter<{ event: { keys: string[]; data: unknown } }>();

  const transport = {
    send: vi.fn().mockResolvedValue(undefined),
    on: (event: string, handler: (...args: any[]) => void) => {
      emitter.on(event as "event", handler);
    },
    off: vi.fn(),
    triggerEvent(keys: string[], data: unknown) {
      emitter.emit("event", { keys, data });
    },
  } as unknown as ServiceTransport & { triggerEvent(keys: string[], data: unknown): void };

  return transport;
}

describe("EventClient getEvent() 프록시", () => {
  let transport: ReturnType<typeof createMockTransport>;
  let eventClient: EventClient;

  beforeEach(() => {
    transport = createMockTransport();
    eventClient = createEventClient(transport);
  });

  it("getEvent()로 프록시를 생성하고 addListener를 호출하면 이벤트 이름이 자동 바인딩된다", async () => {
    const proxy = eventClient.getEvent(TestEvent);
    const cb = vi.fn().mockResolvedValue(undefined);

    const key = await proxy.addListener({ channel: "test-channel" }, cb);

    expect(key).toBeDefined();
    expect(transport.send).toHaveBeenCalledWith({
      name: "evt:add",
      body: { key, name: "TestEvent", info: { channel: "test-channel" } },
    });
  });

  it("getEvent()로 프록시를 생성하고 emit을 호출하면 이벤트 이름이 자동 바인딩된다", async () => {
    (transport.send as ReturnType<typeof vi.fn>).mockImplementation((msg: any) => {
      if (msg.name === "evt:gets") {
        return Promise.resolve([
          { key: "key-1", info: { channel: "test-channel" } },
          { key: "key-2", info: { channel: "other" } },
        ]);
      }
      return Promise.resolve(undefined);
    });

    const proxy = eventClient.getEvent(TestEvent);
    await proxy.emit((item) => item.channel === "test-channel", "hello");

    expect(transport.send).toHaveBeenCalledWith({
      name: "evt:gets",
      body: { name: "TestEvent" },
    });
    expect(transport.send).toHaveBeenCalledWith({
      name: "evt:emit",
      body: { keys: ["key-1"], data: "hello" },
    });
  });

  it("동일 프록시로 여러 리스너를 등록할 수 있다", async () => {
    const proxy = eventClient.getEvent(TestEvent);
    const cb1 = vi.fn().mockResolvedValue(undefined);
    const cb2 = vi.fn().mockResolvedValue(undefined);

    const key1 = await proxy.addListener({ channel: "ch1" }, cb1);
    const key2 = await proxy.addListener({ channel: "ch2" }, cb2);

    expect(key1).not.toBe(key2);
    expect(transport.send).toHaveBeenCalledTimes(2);
  });

  it("getEvent()로 프록시를 생성하고 removeListener를 호출하면 리스너가 제거된다", async () => {
    const proxy = eventClient.getEvent(TestEvent);
    const cb = vi.fn().mockResolvedValue(undefined);

    const key = await proxy.addListener({ channel: "ch" }, cb);
    await proxy.removeListener(key);

    expect(transport.send).toHaveBeenCalledWith({
      name: "evt:remove",
      body: { key },
    });
  });
});

describe("EventClient 시그니처 통일", () => {
  let transport: ReturnType<typeof createMockTransport>;
  let eventClient: EventClient;

  beforeEach(() => {
    transport = createMockTransport();
    eventClient = createEventClient(transport);
  });

  it("addListener(eventDef, info, cb)로 리스너를 등록하면 evt:add 메시지가 전송된다", async () => {
    const cb = vi.fn().mockResolvedValue(undefined);
    const key = await eventClient.addListener(
      TestEvent,
      { channel: "test-channel" },
      cb,
    );

    expect(key).toBeDefined();
    expect(typeof key).toBe("string");
    expect(transport.send).toHaveBeenCalledWith({
      name: "evt:add",
      body: { key, name: "TestEvent", info: { channel: "test-channel" } },
    });
  });

  it("emit(eventDef, selector, data)로 이벤트를 발행하면 evt:gets와 evt:emit 메시지가 전송된다", async () => {
    // evt:gets 응답 모킹
    (transport.send as ReturnType<typeof vi.fn>).mockImplementation((msg: any) => {
      if (msg.name === "evt:gets") {
        return Promise.resolve([
          { key: "key-1", info: { channel: "test-channel" } },
          { key: "key-2", info: { channel: "other" } },
        ]);
      }
      return Promise.resolve(undefined);
    });

    await eventClient.emit(
      TestEvent,
      (item) => item.channel === "test-channel",
      "hello",
    );

    // evt:gets 호출 확인
    expect(transport.send).toHaveBeenCalledWith({
      name: "evt:gets",
      body: { name: "TestEvent" },
    });

    // evt:emit은 매칭된 키만 전송
    expect(transport.send).toHaveBeenCalledWith({
      name: "evt:emit",
      body: { keys: ["key-1"], data: "hello" },
    });
  });

  it("서버에서 evt:on 이벤트를 수신하면 등록된 콜백이 호출된다", async () => {
    const cb = vi.fn().mockResolvedValue(undefined);
    const key = await eventClient.addListener(
      TestEvent,
      { channel: "test-channel" },
      cb,
    );

    // 서버에서 이벤트 수신 시뮬레이션
    transport.triggerEvent([key], "event-data");

    // 비동기 처리 대기
    await new Promise((r) => setTimeout(r, 10));

    expect(cb).toHaveBeenCalledWith("event-data");
  });
});
