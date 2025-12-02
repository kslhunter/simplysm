import { Type, Uuid } from "@simplysm/sd-core-common";
import { SdServiceTransport } from "./SdServiceTransport";
import { SdServiceEventListenerBase } from "@simplysm/sd-service-common";

type TEventCallback = (data: any) => PromiseLike<void> | void;

interface IEventListenerEntry {
  name: string;
  info: any;
  cb: TEventCallback;
}

/**
 * SdServiceClient의 이벤트 리스너 등록/재등록/콜백 실행을 담당하는 EventBus
 */
export class SdServiceEventBus {
  // key -> { name, info, cb }
  #listenerMap = new Map<string, IEventListenerEntry>();

  constructor(private readonly _transport: SdServiceTransport) {}

  /**
   * 이벤트 리스너 등록
   * - 서버에 addEventListener 전송
   * - 로컬 콜백 저장
   */
  async addListenerAsync<T extends SdServiceEventListenerBase<any, any>>(
    eventListenerType: Type<T>,
    info: T["info"],
    cb: (data: T["data"]) => PromiseLike<void>,
  ): Promise<string> {
    const key = Uuid.new().toString();

    await this._transport.sendAsync(Uuid.new().toString(), {
      name: "evt:add",
      body: { key, name: eventListenerType.name, info },
    });

    this.#listenerMap.set(key, {
      name: eventListenerType.name,
      info,
      cb,
    });

    return key;
  }

  /**
   * 이벤트 리스너 제거
   */
  async removeListenerAsync(key: string): Promise<void> {
    await this._transport.sendAsync(Uuid.new().toString(), { name: "evt:remove", body: { key } });
    this.#listenerMap.delete(key);
  }

  /**
   * WebSocket 재연결 후 서버에 리스너 재등록
   * (콜백은 그대로 유지)
   */
  async reRegisterAllAsync(): Promise<void> {
    for (const [key, value] of this.#listenerMap.entries()) {
      await this._transport.sendAsync(Uuid.new().toString(), {
        name: "evt:add",
        body: {
          key,
          name: value.name,
          info: value.info,
        },
      });
    }
  }

  /**
   * 서버로부터 "event" 메시지 수신 시 콜백 실행
   */
  async handleEventByKeysAsync(keys: string[], data: any): Promise<void> {
    for (const key of keys) {
      const entry = this.#listenerMap.get(key);
      if (!entry) continue;
      await entry.cb(data);
    }
  }

  /**
   * (디버깅/상태 확인용) 현재 리스너 목록
   */
  get listenerInfoEntries(): ReadonlyArray<{ key: string; name: string; info: any }> {
    return Array.from(this.#listenerMap.entries()).map(([key, value]) => ({
      key,
      name: value.name,
      info: value.info,
    }));
  }
}
