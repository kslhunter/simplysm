import { Uuid } from "@simplysm/core-common";
import type { ServiceEventDef } from "@simplysm/service-common";
import type { ServiceTransport } from "../transport/service-transport";
import { createLogger } from "@simplysm/core-common";

const logger = createLogger("service-client:EventClient");

export interface ClientEventProxy<TEventDef extends ServiceEventDef> {
  addListener(
    info: TEventDef["$info"],
    cb: (data: TEventDef["$data"]) => PromiseLike<void>,
  ): Promise<string>;
  removeListener(key: string): Promise<void>;
  emit(
    infoSelector: (item: TEventDef["$info"]) => boolean,
    data: TEventDef["$data"],
  ): Promise<void>;
}

export interface EventClient {
  getEvent<TEventDef extends ServiceEventDef>(
    eventDef: TEventDef,
  ): ClientEventProxy<TEventDef>;
  addListener<TEventDef extends ServiceEventDef>(
    eventDef: TEventDef,
    info: TEventDef["$info"],
    cb: (data: TEventDef["$data"]) => PromiseLike<void>,
  ): Promise<string>;
  removeListener(key: string): Promise<void>;
  emit<TEventDef extends ServiceEventDef>(
    eventDef: TEventDef,
    infoSelector: (item: TEventDef["$info"]) => boolean,
    data: TEventDef["$data"],
  ): Promise<void>;
  resubscribeAll(): Promise<void>;
}

export function createEventClient(transport: ServiceTransport): EventClient {
  const listenerMap = new Map<
    string,
    { eventName: string; info: unknown; cb: (data: unknown) => PromiseLike<void> | void }
  >();

  transport.on("event", async ({ keys, data }) => {
    await executeByKey(keys, data);
  });

  async function addListener<TEventDef extends ServiceEventDef>(
    eventDef: TEventDef,
    info: TEventDef["$info"],
    cb: (data: TEventDef["$data"]) => PromiseLike<void>,
  ): Promise<string> {
    const key = Uuid.generate().toString();
    const eventName = eventDef.eventName;

    // 서버에 등록 요청 전송
    await transport.send({
      name: "evt:add",
      body: { key, name: eventName, info },
    });

    // 로컬 맵에 저장 (재연결 시 복구용)
    listenerMap.set(key, {
      eventName,
      info,
      cb,
    });

    return key;
  }

  async function removeListener(key: string): Promise<void> {
    listenerMap.delete(key);
    try {
      await transport.send({ name: "evt:remove", body: { key } });
    } catch {
      // 서버가 연결 끊김 시 이벤트 리스너를 자동 정리하므로 무시해도 안전함
    }
  }

  async function emit<TEventDef extends ServiceEventDef>(
    eventDef: TEventDef,
    infoSelector: (item: TEventDef["$info"]) => boolean,
    data: TEventDef["$data"],
  ): Promise<void> {
    const eventName = eventDef.eventName;

    // 서버에 'gets' 요청을 보내 대상 목록 조회
    const listenerInfos = (await transport.send({
      name: "evt:gets",
      body: { name: eventName },
    })) as { key: string; info: TEventDef["$info"] }[];

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

  // 재연결 시 호출
  async function resubscribeAll(): Promise<void> {
    await Promise.allSettled(
      Array.from(listenerMap.entries()).map(async ([key, value]) => {
        try {
          await transport.send({
            name: "evt:add",
            body: { key, name: value.eventName, info: value.info },
          });
        } catch (err) {
          logger.error("이벤트 리스너 복구 실패", { err, eventName: value.eventName });
        }
      }),
    );
  }

  // 서버 이벤트를 로컬 리스너에 디스패치
  async function executeByKey(keys: string[], data: unknown): Promise<void> {
    for (const key of keys) {
      const entry = listenerMap.get(key);
      if (entry != null) {
        try {
          await entry.cb(data);
        } catch (err) {
          logger.error("이벤트 핸들러 에러", { err, eventName: entry.eventName });
        }
      }
    }
  }

  function getEvent<TEventDef extends ServiceEventDef>(
    eventDef: TEventDef,
  ): ClientEventProxy<TEventDef> {
    return {
      addListener: (info, cb) => addListener<TEventDef>(eventDef, info, cb),
      removeListener,
      emit: (infoSelector, data) => emit<TEventDef>(eventDef, infoSelector, data),
    };
  }

  return {
    getEvent,
    addListener,
    removeListener,
    emit,
    resubscribeAll,
  };
}
