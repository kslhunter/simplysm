import type { Type } from "@simplysm/core-common";
import { Uuid } from "@simplysm/core-common";
import type { ServiceEventListener } from "@simplysm/service-common";
import type { ServiceTransport } from "../transport/service-transport";
import consola from "consola";

const logger = consola.withTag("service-client:EventClient");

export class EventClient {
  private readonly _listenerMap = new Map<
    string,
    { eventName: string; info: unknown; cb: (data: unknown) => PromiseLike<void> | void }
  >();

  constructor(private readonly _transport: ServiceTransport) {
    this._transport.on("event", async ({ keys, data }) => {
      await this._executeByKey(keys, data);
    });
  }

  async addListener<T extends ServiceEventListener<unknown, unknown>>(
    eventListenerType: Type<T>,
    info: T["$info"],
    cb: (data: T["$data"]) => PromiseLike<void>,
  ): Promise<string> {
    const key = Uuid.new().toString();
    // mangle 안전한 이벤트명 사용
    const eventName = eventListenerType.prototype.eventName;

    // 서버에 등록 요청
    await this._transport.send({
      name: "evt:add",
      body: { key, name: eventName, info },
    });

    // 로컬 맵에 저장 (재연결 시 복구용)
    this._listenerMap.set(key, {
      eventName,
      info,
      cb,
    });

    return key;
  }

  async removeListener(key: string): Promise<void> {
    await this._transport.send({ name: "evt:remove", body: { key } });
    this._listenerMap.delete(key);
  }

  async emitToServer<T extends ServiceEventListener<unknown, unknown>>(
    eventType: Type<T>,
    infoSelector: (item: T["$info"]) => boolean,
    data: T["$data"],
  ): Promise<void> {
    // mangle 안전한 이벤트명 사용
    const eventName = eventType.prototype.eventName;

    // 서버에 'gets' 요청을 보내 타겟을 확보
    const listenerInfos = (await this._transport.send({
      name: "evt:gets",
      body: { name: eventName },
    })) as { key: string; info: T["$info"] }[];

    const targetKeys = listenerInfos.filter((item) => infoSelector(item.info)).map((item) => item.key);

    if (targetKeys.length > 0) {
      await this._transport.send({
        name: "evt:emit",
        body: { keys: targetKeys, data },
      });
    }
  }

  // 재연결 시 호출됨
  async reRegisterAll(): Promise<void> {
    for (const [key, value] of this._listenerMap.entries()) {
      try {
        await this._transport.send({
          name: "evt:add",
          body: { key, name: value.eventName, info: value.info },
        });
      } catch (err) {
        logger.error("이벤트 리스너 복구 실패", { err, eventName: value.eventName });
      }
    }
  }

  // 서버에서 온 이벤트를 로컬 리스너에게 분배
  private async _executeByKey(keys: string[], data: unknown): Promise<void> {
    for (const key of keys) {
      const entry = this._listenerMap.get(key);
      if (entry != null) {
        try {
          await entry.cb(data);
        } catch (err) {
          logger.error("이벤트 핸들러 오류", { err, eventName: entry.eventName });
        }
      }
    }
  }
}
