import { describe, expect, it } from "vitest";
import type { WebSocket } from "ws";
import type { ServiceContext } from "../src/core/define-service";
import {
  handleV1Connection,
  type V1RequestHandler,
  type V1Response,
} from "../src/legacy/v1-auto-update-handler";

type MessageListener = (data: { toString(): string }) => Promise<void> | void;

class FakeWebSocket {
  readonly sentMessages: string[] = [];
  private _messageListener: MessageListener | undefined;

  send(data: string) {
    this.sentMessages.push(data);
  }

  on(_event: "message", listener: MessageListener) {
    this._messageListener = listener;
    return this;
  }

  async receive(message: object) {
    if (this._messageListener == null) throw new Error("message listener is not registered");
    await this._messageListener({ toString: () => JSON.stringify(message) });
  }
}

function parseLastResponse(socket: FakeWebSocket): V1Response {
  const lastMessage = socket.sentMessages.at(-1);
  if (lastMessage == null) throw new Error("response is missing");
  return JSON.parse(lastMessage) as V1Response;
}

function parseResponses(socket: FakeWebSocket): V1Response[] {
  return socket.sentMessages
    .map((message) => JSON.parse(message) as { name?: string })
    .filter((message): message is V1Response => message.name === "response");
}

function createServiceContext(clientNameGetter: () => string | undefined): ServiceContext {
  return {
    server: {} as ServiceContext["server"],
    legacy: {},
    get authInfo() {
      return undefined;
    },
    get clientName() {
      return clientNameGetter();
    },
    get clientPath() {
      return undefined;
    },
    getConfig: () => Promise.reject(new Error("not used")),
  };
}

describe("handleV1Connection", () => {
  it("요청별 clientName을 핸들러 컨텍스트에서 확인할 수 있게 한다", async () => {
    const socket = new FakeWebSocket();
    let currentClientName: string | undefined;
    let observedClientName: string | undefined;

    const handler: V1RequestHandler = ({ serviceContext }) => {
      observedClientName = serviceContext.clientName;
      return { handled: true, body: "ok" };
    };

    handleV1Connection(socket as unknown as WebSocket, {
      serviceContext: createServiceContext(() => currentClientName),
      handlers: [handler],
      clientNameSetter: (clientName) => {
        currentClientName = clientName;
      },
    });

    await socket.receive({
      uuid: "req-1",
      command: "LegacyBootstrap.getConfig",
      params: [],
      clientName: "legacy-app",
    });

    expect(observedClientName).toBe("legacy-app");
    expect(parseLastResponse(socket).body).toBe("ok");
  });

  it("처리된 요청은 이후 핸들러와 AutoUpdate fallback을 실행하지 않는다", async () => {
    const socket = new FakeWebSocket();
    const calls: string[] = [];

    handleV1Connection(socket as unknown as WebSocket, {
      serviceContext: createServiceContext(() => undefined),
      handlers: [
        () => {
          calls.push("first");
          return { handled: true, body: "first-result" };
        },
        () => {
          calls.push("second");
          return { handled: true, body: "second-result" };
        },
      ],
      autoUpdateMethods: {
        getLastVersion: () => {
          calls.push("auto-update");
          return "auto-update-result";
        },
      },
    });

    await socket.receive({
      uuid: "req-2",
      command: "SdAutoUpdateService.getLastVersion",
      params: ["android"],
      clientName: "legacy-app",
    });

    expect(calls).toEqual(["first"]);
    expect(parseLastResponse(socket)).toEqual({
      name: "response",
      reqUuid: "req-2",
      state: "success",
      body: "first-result",
    });
  });

  it("AutoUpdate 명령이 아니면 AutoUpdate fallback factory를 실행하지 않는다", async () => {
    const socket = new FakeWebSocket();
    let fallbackFactoryCalled = false;

    handleV1Connection(socket as unknown as WebSocket, {
      serviceContext: createServiceContext(() => "legacy-app"),
      autoUpdateMethodsFactory: () => {
        fallbackFactoryCalled = true;
        return {
          getLastVersion: () => "auto-update-result",
        };
      },
    });

    await socket.receive({
      uuid: "req-3",
      command: "Unknown.command",
      params: [],
      clientName: "legacy-app",
    });

    expect(fallbackFactoryCalled).toBe(false);
    expect(parseLastResponse(socket)).toEqual({
      name: "response",
      reqUuid: "req-3",
      state: "error",
      body: {
        message: "앱 업그레이드가 필요합니다.",
        code: "UPGRADE_REQUIRED",
      },
    });
  });

  it("동시에 처리되는 요청도 요청별 clientName을 유지한다", async () => {
    const socket = new FakeWebSocket();
    let releaseFirst: () => void = () => {
      throw new Error("first request is not paused");
    };
    const firstPaused = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const handler: V1RequestHandler = async ({ request, serviceContext }) => {
      if (request.uuid === "req-1") {
        await firstPaused;
      }

      return { handled: true, body: serviceContext.clientName };
    };

    handleV1Connection(socket as unknown as WebSocket, {
      serviceContextFactory: (request) => createServiceContext(() => request.clientName),
      handlers: [handler],
    });

    const firstReceive = socket.receive({
      uuid: "req-1",
      command: "LegacyBootstrap.getConfig",
      params: [],
      clientName: "client-a",
    });
    await socket.receive({
      uuid: "req-2",
      command: "LegacyBootstrap.getConfig",
      params: [],
      clientName: "client-b",
    });
    releaseFirst();
    await firstReceive;

    const responses = parseResponses(socket);
    expect(responses.find((item) => item.reqUuid === "req-1")?.body).toBe("client-a");
    expect(responses.find((item) => item.reqUuid === "req-2")?.body).toBe("client-b");
  });
});
