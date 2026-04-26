import { describe, expect, it } from "vitest";
import { WebSocket as WsClient, type RawData, type WebSocket } from "ws";
import {
  createServiceServer,
  handleV1Connection,
  type ServiceServerOptions,
  type V1RequestHandler,
  type V1Response,
} from "@simplysm/service-server";
import type { ServiceContext } from "../src/core/define-service";
import fs from "node:fs/promises";
import type { AddressInfo } from "node:net";
import path from "node:path";

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

function waitForOpen(socket: WsClient): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once("open", () => resolve());
    socket.once("error", reject);
  });
}

function collectResponses(
  socket: WsClient,
  count: number,
  onResponse?: (response: V1Response) => void,
): Promise<V1Response[]> {
  return new Promise((resolve, reject) => {
    const responses: V1Response[] = [];
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`V1 response timeout: ${responses.length}/${count}`));
    }, 5000);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off("message", onMessage);
      socket.off("error", onError);
    };

    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    const onMessage = (data: RawData) => {
      const message = JSON.parse(data.toString()) as { name?: string };
      if (message.name !== "response") return;

      const response = message as V1Response;
      responses.push(response);
      onResponse?.(response);

      if (responses.length === count) {
        cleanup();
        resolve(responses);
      }
    };

    socket.on("message", onMessage);
    socket.on("error", onError);
  });
}

function createServiceContext(clientNameGetter?: () => string | undefined): ServiceContext {
  return {
    server: {} as ServiceContext["server"],
    legacy: {},
    get authInfo() {
      return undefined;
    },
    get clientName() {
      return clientNameGetter?.();
    },
    get clientPath() {
      return undefined;
    },
    getConfig: () => Promise.reject(new Error("not used")),
  };
}

describe("V1 레거시 사용자 핸들러", () => {
  it("서버 옵션으로 V1 사용자 핸들러를 등록할 수 있다", () => {
    const options = {
      rootPath: ".",
      port: 0,
      services: [],
      legacyV1Handlers: [
        ({ request }) =>
          request.command === "LegacyBootstrap.getConfig"
            ? { handled: true, body: "ok" }
            : { handled: false },
      ],
    } satisfies ServiceServerOptions;

    expect(options.legacyV1Handlers).toHaveLength(1);
  });

  it("등록된 사용자 핸들러가 V1 요청을 처리한다", async () => {
    const socket = new FakeWebSocket();
    const handler: V1RequestHandler = ({ request }) => {
      if (request.command !== "LegacyBootstrap.getConfig") return { handled: false };
      return { handled: true, body: { apiUrl: request.params[0] } };
    };

    handleV1Connection(socket as unknown as WebSocket, {
      serviceContext: createServiceContext(),
      handlers: [handler],
      autoUpdateMethods: {
        getLastVersion: () => {
          throw new Error("auto update fallback must not run");
        },
      },
    });

    await socket.receive({
      uuid: "req-1",
      command: "LegacyBootstrap.getConfig",
      params: ["https://example.local"],
      clientName: "legacy-app",
    });

    expect(parseLastResponse(socket)).toEqual({
      name: "response",
      reqUuid: "req-1",
      state: "success",
      body: { apiUrl: "https://example.local" },
    });
  });

  it("사용자 핸들러가 처리하지 않은 자동 업데이트 요청은 기존 AutoUpdate로 fallback한다", async () => {
    const socket = new FakeWebSocket();
    const passHandler: V1RequestHandler = () => ({ handled: false });

    handleV1Connection(socket as unknown as WebSocket, {
      serviceContext: createServiceContext(),
      handlers: [passHandler],
      autoUpdateMethods: {
        getLastVersion: (platform: string) => ({ platform, version: "1.2.3" }),
      },
    });

    await socket.receive({
      uuid: "req-2",
      command: "SdAutoUpdateService.getLastVersion",
      params: ["android"],
      clientName: "legacy-app",
    });

    expect(parseLastResponse(socket)).toEqual({
      name: "response",
      reqUuid: "req-2",
      state: "success",
      body: { platform: "android", version: "1.2.3" },
    });
  });

  it("어떤 핸들러도 모르는 명령은 기존 업그레이드 필요 오류를 반환한다", async () => {
    const socket = new FakeWebSocket();
    const passHandler: V1RequestHandler = () => ({ handled: false });

    handleV1Connection(socket as unknown as WebSocket, {
      serviceContext: createServiceContext(),
      handlers: [passHandler],
    });

    await socket.receive({
      uuid: "req-3",
      command: "Unknown.command",
      params: [],
      clientName: "legacy-app",
    });

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

  it("동시에 들어온 사용자 핸들러 요청도 요청별 clientName으로 처리한다", async () => {
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

      return { handled: true, body: { clientName: serviceContext.clientName } };
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
    expect(responses.find((item) => item.reqUuid === "req-1")?.body).toEqual({
      clientName: "client-a",
    });
    expect(responses.find((item) => item.reqUuid === "req-2")?.body).toEqual({
      clientName: "client-b",
    });
  });

  it("ServiceServer legacyV1Handlers는 동시에 들어온 요청별 clientName을 격리한다", async () => {
    const rootPath = path.resolve(".tmp", "service-server-v1-legacy-handler");
    await fs.mkdir(path.resolve(rootPath, "www"), { recursive: true });

    let releaseFirst: () => void = () => {
      throw new Error("first request is not paused");
    };
    const firstPaused = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const server = createServiceServer({
      rootPath,
      port: 0,
      services: [],
      legacyV1Handlers: [
        async ({ request, serviceContext }) => {
          if (request.uuid === "req-1") {
            await firstPaused;
          }

          return { handled: true, body: { clientName: serviceContext.clientName } };
        },
      ],
    });

    let socket: WsClient | undefined;
    try {
      await server.listen();
      const address = server.fastify.server.address() as AddressInfo;
      socket = new WsClient(`ws://127.0.0.1:${address.port}/ws`);
      await waitForOpen(socket);

      const responsesPromise = collectResponses(socket, 2, (response) => {
        if (response.reqUuid === "req-2") {
          releaseFirst();
        }
      });

      socket.send(
        JSON.stringify({
          uuid: "req-1",
          command: "LegacyBootstrap.getConfig",
          params: [],
          clientName: "client-a",
        }),
      );
      socket.send(
        JSON.stringify({
          uuid: "req-2",
          command: "LegacyBootstrap.getConfig",
          params: [],
          clientName: "client-b",
        }),
      );

      const responses = await responsesPromise;
      expect(responses.find((item) => item.reqUuid === "req-1")?.body).toEqual({
        clientName: "client-a",
      });
      expect(responses.find((item) => item.reqUuid === "req-2")?.body).toEqual({
        clientName: "client-b",
      });
    } finally {
      socket?.close();
      if (server.isOpen) {
        await server.close();
      }
      await fs.rm(rootPath, { recursive: true, force: true });
    }
  });
});
