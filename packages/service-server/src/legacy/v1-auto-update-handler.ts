import type { WebSocket } from "ws";
import type { ServiceContext } from "../core/define-service";
import consola from "consola";

const logger = consola.withTag("service-server:V1AutoUpdateHandler");

export interface V1Request {
  uuid: string;
  command: string;
  params: unknown[];
  clientName?: string;
}

export interface V1Response {
  name: "response";
  reqUuid: string;
  state: "success" | "error";
  body: unknown;
}

export interface V1AutoUpdateMethods {
  getLastVersion: (platform: string) => Promise<unknown> | unknown;
}

export type V1RequestHandlerResult =
  | {
      handled: true;
      state?: V1Response["state"];
      body: unknown;
    }
  | {
      handled: false;
    };

export interface V1RequestHandlerContext {
  request: V1Request;
  serviceContext: ServiceContext;
}

export type V1RequestHandler =
  | ((ctx: V1RequestHandlerContext) => Promise<V1RequestHandlerResult>)
  | ((ctx: V1RequestHandlerContext) => V1RequestHandlerResult);

export interface V1ConnectionOptions {
  serviceContext?: ServiceContext;
  serviceContextFactory?: (request: V1Request) => ServiceContext;
  handlers?: V1RequestHandler[];
  autoUpdateMethods?: V1AutoUpdateMethods;
  autoUpdateMethodsFactory?: (ctx: V1RequestHandlerContext) => V1AutoUpdateMethods;
  clientNameSetter?: (clientName: string | undefined) => void;
}

/**
 * V1 레거시 클라이언트 핸들러.
 * 사용자 핸들러가 처리하지 않은 요청은 자동 업데이트 fallback 또는 업그레이드 필요 에러로 처리한다.
 */
export function handleV1Connection(
  socket: WebSocket,
  autoUpdateMethods: V1AutoUpdateMethods,
  clientNameSetter?: (clientName: string | undefined) => void,
): void;
export function handleV1Connection(socket: WebSocket, options: V1ConnectionOptions): void;
export function handleV1Connection(
  socket: WebSocket,
  optionsOrMethods: V1AutoUpdateMethods | V1ConnectionOptions,
  clientNameSetter?: (clientName: string | undefined) => void,
) {
  const options =
    "getLastVersion" in optionsOrMethods
      ? { autoUpdateMethods: optionsOrMethods, clientNameSetter }
      : optionsOrMethods;

  // 연결 성립 알림
  socket.send(JSON.stringify({ name: "connected" }));

  socket.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString()) as V1Request;
      options.clientNameSetter?.(msg.clientName);

      const serviceContext = options.serviceContextFactory?.(msg) ?? options.serviceContext;
      const handlerResult = await executeCustomHandler(msg, options.handlers ?? [], serviceContext);
      if (handlerResult.handled) {
        sendResponse(socket, msg.uuid, handlerResult.state ?? "success", handlerResult.body);
        return;
      }

      if (msg.command === "SdAutoUpdateService.getLastVersion") {
        const autoUpdateMethods = resolveAutoUpdateMethods(msg, options, serviceContext);
        if (autoUpdateMethods != null) {
          const result = await autoUpdateMethods.getLastVersion(msg.params[0] as string);

          sendResponse(socket, msg.uuid, "success", result);
          return;
        }
      }

      sendResponse(socket, msg.uuid, "error", {
        message: "앱 업그레이드가 필요합니다.",
        code: "UPGRADE_REQUIRED",
      });
    } catch (err) {
      logger.warn("V1 메시지 처리 에러", err);
    }
  });
}

async function executeCustomHandler(
  request: V1Request,
  handlers: V1RequestHandler[],
  serviceContext: ServiceContext | undefined,
): Promise<V1RequestHandlerResult> {
  if (handlers.length < 1) return { handled: false };

  if (serviceContext == null) {
    throw new Error("V1 핸들러를 실행하려면 serviceContext가 필요합니다.");
  }

  for (const handler of handlers) {
    const result = await handler({ request, serviceContext });
    if (result.handled) return result;
  }

  return { handled: false };
}

function resolveAutoUpdateMethods(
  request: V1Request,
  options: V1ConnectionOptions,
  serviceContext: ServiceContext | undefined,
): V1AutoUpdateMethods | undefined {
  if (options.autoUpdateMethodsFactory == null) return options.autoUpdateMethods;
  if (serviceContext == null) {
    throw new Error("V1 자동 업데이트 fallback을 실행하려면 serviceContext가 필요합니다.");
  }

  return options.autoUpdateMethodsFactory({ request, serviceContext });
}

function sendResponse(
  socket: WebSocket,
  reqUuid: string,
  state: V1Response["state"],
  body: unknown,
) {
  const response: V1Response = {
    name: "response",
    reqUuid,
    state,
    body,
  };
  socket.send(JSON.stringify(response));
}
