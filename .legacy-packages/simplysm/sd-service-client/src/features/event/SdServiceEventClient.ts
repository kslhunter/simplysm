/* eslint-disable no-console */
import type { Type } from "@simplysm/sd-core-common";
import { Uuid } from "@simplysm/sd-core-common";
import type { SdServiceEventListenerBase } from "@simplysm/sd-service-common";
import type { SdServiceTransport } from "../../transport/SdServiceTransport";

export class SdServiceEventClient {
  private readonly _listenerMap = new Map<
    string,
    { name: string; info: any; cb: (data: any) => PromiseLike<void> | void }
  >();

  constructor(private readonly _transport: SdServiceTransport) {
    this._transport.on("event", async (keys: string[], data: any) => {
      await this._executeByKeyAsync(keys, data);
    });
  }

  async addListenerAsync<T extends SdServiceEventListenerBase<any, any>>(
    eventListenerType: Type<T>,
    info: T["info"],
    cb: (data: T["data"]) => PromiseLike<void>,
  ): Promise<string> {
    const key = Uuid.new().toString();

    // 서버에 등록 요청
    await this._transport.sendAsync({
      name: "evt:add",
      body: { key, name: eventListenerType.name, info },
    });

    // 로컬 맵에 저장 (재연결 시 복구용)
    this._listenerMap.set(key, {
      name: eventListenerType.name,
      info,
      cb,
    });

    return key;
  }

  async removeListenerAsync(key: string): Promise<void> {
    await this._transport.sendAsync({ name: "evt:remove", body: { key } });
    this._listenerMap.delete(key);
  }

  async emitAsync<T extends SdServiceEventListenerBase<any, any>>(
    eventType: Type<T>,
    infoSelector: (item: T["info"]) => boolean,
    data: T["data"],
  ): Promise<void> {
    // 1. 내 구독 목록 중 대상 확인
    // (서버에 물어보지 않고 클라이언트가 아는 정보로 타겟팅을 돕거나, 서버에 필터링 위임 가능)
    // 여기서는 서버에 'gets' 요청을 보내 타겟을 확보하는 기존 로직 유지
    const listenerInfos: { key: string; info: T["info"] }[] = await this._transport.sendAsync({
      name: "evt:gets",
      body: { name: eventType.name },
    });

    const targetKeys = listenerInfos
      .filter((item) => infoSelector(item.info))
      .map((item) => item.key);

    if (targetKeys.length > 0) {
      await this._transport.sendAsync({
        name: "evt:emit",
        body: { keys: targetKeys, data },
      });
    }
  }

  // 재연결 시 호출됨
  async reRegisterAllAsync(): Promise<void> {
    for (const [key, value] of this._listenerMap.entries()) {
      try {
        await this._transport.sendAsync({
          name: "evt:add",
          body: { key, name: value.name, info: value.info },
        });
      } catch (err) {
        console.error(`이벤트 리스너 복구 실패 (${value.name})`, err);
      }
    }
  }

  // [추가] 서버에서 온 이벤트를 로컬 리스너에게 분배
  private async _executeByKeyAsync(keys: string[], data: any): Promise<void> {
    for (const key of keys) {
      const entry = this._listenerMap.get(key);
      if (entry) {
        try {
          await entry.cb(data);
        } catch (err) {
          console.error(`이벤트 핸들러 오류 (${entry.name})`, err);
        }
      }
    }
  }
}
