import { Uuid } from "@simplysm/core-common";
import type { ServiceEventDef } from "@simplysm/service-common";
import type { ServiceTransport } from "../transport/service-transport";
import consola from "consola";

const logger = consola.withTag("service-client:EventClient");

export interface EventClient {
  addListener<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    info: TInfo,
    cb: (data: TData) => PromiseLike<void>,
  ): Promise<string>;
  removeListener(key: string): Promise<void>;
  emitToServer<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    infoSelector: (item: TInfo) => boolean,
    data: TData,
  ): Promise<void>;
  reRegisterAll(): Promise<void>;
}

export function createEventClient(transport: ServiceTransport): EventClient {
  const listenerMap = new Map<
    string,
    { eventName: string; info: unknown; cb: (data: unknown) => PromiseLike<void> | void }
  >();

  transport.on("event", async ({ keys, data }) => {
    await executeByKey(keys, data);
  });

  async function addListener<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    info: TInfo,
    cb: (data: TData) => PromiseLike<void>,
  ): Promise<string> {
    const key = Uuid.new().toString();
    const eventName = eventDef.eventName;

    // Send registration request to server
    await transport.send({
      name: "evt:add",
      body: { key, name: eventName, info },
    });

    // Store in local map (for recovery on reconnect)
    listenerMap.set(key, {
      eventName,
      info,
      cb: cb as (data: unknown) => PromiseLike<void>,
    });

    return key;
  }

  async function removeListener(key: string): Promise<void> {
    await transport.send({ name: "evt:remove", body: { key } });
    listenerMap.delete(key);
  }

  async function emitToServer<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    infoSelector: (item: TInfo) => boolean,
    data: TData,
  ): Promise<void> {
    const eventName = eventDef.eventName;

    // Send 'gets' request to server to obtain targets
    const listenerInfos = (await transport.send({
      name: "evt:gets",
      body: { name: eventName },
    })) as { key: string; info: TInfo }[];

    const targetKeys = listenerInfos
      .filter((item) => infoSelector(item.info))
      .map((item) => item.key);

    if (targetKeys.length > 0) {
      await transport.send({
        name: "evt:emit",
        body: { keys: targetKeys, data },
      });
    }
  }

  // Called on reconnect
  async function reRegisterAll(): Promise<void> {
    for (const [key, value] of listenerMap.entries()) {
      try {
        await transport.send({
          name: "evt:add",
          body: { key, name: value.eventName, info: value.info },
        });
      } catch (err) {
        logger.error("이벤트 리스너 복구 실패", { err, eventName: value.eventName });
      }
    }
  }

  // Dispatch server events to local listeners
  async function executeByKey(keys: string[], data: unknown): Promise<void> {
    for (const key of keys) {
      const entry = listenerMap.get(key);
      if (entry != null) {
        try {
          await entry.cb(data);
        } catch (err) {
          logger.error("이벤트 핸들러 오류", { err, eventName: entry.eventName });
        }
      }
    }
  }

  return {
    addListener,
    removeListener,
    emitToServer,
    reRegisterAll,
  };
}
