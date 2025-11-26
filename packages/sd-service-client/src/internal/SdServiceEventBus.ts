import { Type, Uuid } from "@simplysm/sd-core-common";
import {
  SD_SERVICE_SPECIAL_COMMANDS,
  SdServiceEventListenerBase,
} from "@simplysm/sd-service-common";
import { SdServiceTransport } from "./SdServiceTransport";

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

    await this._transport.sendCommandAsync(SD_SERVICE_SPECIAL_COMMANDS.ADD_EVENT_LISTENER, [
      key,
      eventListenerType.name,
      info,
    ]);

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
    await this._transport.sendCommandAsync(SD_SERVICE_SPECIAL_COMMANDS.REMOVE_EVENT_LISTENER, [
      key,
    ]);
    this.#listenerMap.delete(key);
  }

  /**
   * WebSocket 재연결 후 서버에 리스너 재등록
   * (콜백은 그대로 유지)
   */
  async reRegisterAllAsync(): Promise<void> {
    for (const [key, value] of this.#listenerMap.entries()) {
      await this._transport.sendCommandAsync(SD_SERVICE_SPECIAL_COMMANDS.ADD_EVENT_LISTENER, [
        key,
        value.name,
        value.info,
      ]);
    }
  }

  /**
   * 서버로부터 "event" 메시지 수신 시 콜백 실행
   */
  async handleEventAsync(key: string, body: any): Promise<void> {
    const entry = this.#listenerMap.get(key);
    if (!entry) return;

    await entry.cb(body);
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
