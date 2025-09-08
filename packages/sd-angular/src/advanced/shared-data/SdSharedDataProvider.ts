import { inject, Injectable, Signal, WritableSignal } from "@angular/core";
import { SdServiceEventListenerBase } from "@simplysm/sd-service-common";
import { SdServiceClientFactoryProvider } from "../../providers/SdServiceClientFactoryProvider";
import { DateOnly, DateTime, ObjectUtils, Time, Wait } from "@simplysm/sd-core-common";
import { $signal } from "../../utils/bindings/$signal";
import { $computed } from "../../utils/bindings/$computed";

export interface ISharedSignal<T extends ISharedDataBase<string | number>> extends Signal<T[]> {
  $get(key: T["__valueKey"] | undefined): T | undefined;

  // $wait(): Promise<void>;
}

@Injectable({ providedIn: "root" })
export abstract class SdSharedDataProvider<
  T extends Record<string, ISharedDataBase<string | number>>,
> {
  #sdServiceFactory = inject(SdServiceClientFactoryProvider);

  #infoMap = new Map<keyof T & string, ISharedDataInnerInfo<any>>();

  loadingCount = 0;

  abstract initialize(): void;

  register<K extends keyof T & string>(name: K, getter: ISharedDataInfo<T[K]>) {
    this.#infoMap.set(name, { getter });
  }

  async emitAsync<K extends keyof T & string>(name: K, changeKeys?: T[K]["__valueKey"][]) {
    const info = this.#infoMap.get(name);
    if (!info) throw new Error(`'${name}'에 대한 공유데이터 정보가 없습니다.`);

    await this.#sdServiceFactory
      .get(info.getter.serviceKey)
      .emitAsync(
        SdSharedDataChangeEvent,
        (item) => item.name === name && ObjectUtils.equal(item.filter, info.getter.filter),
        changeKeys,
      );
  }

  async wait() {
    await Wait.until(() => this.loadingCount <= 0);
  }

  getSignal<K extends keyof T & string>(name: K): ISharedSignal<T[K]> {
    const info = this.#infoMap.get(name);
    if (!info) throw new Error(`'${name}'에 대한 공유데이터 정보가 없습니다.`);

    //-- listener
    if (info.listenerKey == null) {
      info.listenerKey = void this.#sdServiceFactory
        .get(info.getter.serviceKey)
        .addEventListenerAsync(
          SdSharedDataChangeEvent,
          {
            name,
            filter: info.getter.filter,
          },
          async (changeKeys) => {
            await this.#loadDataAsync(name, changeKeys);
          },
        );
    }

    //-- data
    if (!info.signal) {
      info.signal = $signal([]);

      const computedMap = $computed(() => info.signal!().toMap((item) => item.__valueKey));
      info.signal["$get"] = (key: T[K]["__valueKey"]) => computedMap().get(key);

      void this.#loadDataAsync(name);
    }

    return info.signal as any;
  }

  async #loadDataAsync<K extends keyof T & string>(name: K, changeKeys?: T[K]["__valueKey"][]) {
    this.loadingCount++;
    try {
      const info = this.#infoMap.get(name);
      if (!info) throw new Error(`'${name}'에 대한 공유데이터 로직 정보가 없습니다.`);
      if (!info.signal) throw new Error(`'${name}'에 대한 공유데이터 저장소가 없습니다.`);

      const resData = await info.getter.getDataAsync(changeKeys);

      if (!changeKeys) {
        info.signal.set(this.#ordering(resData, info.getter.orderBy));
      } else {
        info.signal.update((v) => {
          // changeKeys에 있는것 전부 삭제
          const r = v.filter((item) => !changeKeys.includes(item.__valueKey));

          // changeKeys로 검색한 결과물인, resData를 다시 입력
          r.push(...resData);

          // 재정렬
          return this.#ordering(r, info.getter.orderBy);
        });
      }
      this.loadingCount--;
    } catch (err) {
      this.loadingCount--;
      throw err;
    }
  }

  #ordering<TT extends T[keyof T]>(
    data: TT[],
    orderByList: [
      (data: TT) => string | number | DateOnly | DateTime | Time | undefined,
      "asc" | "desc",
    ][],
  ): TT[] {
    let result = [...data];
    for (const orderBy of orderByList.reverse()) {
      if (orderBy[1] === "desc") {
        result = result.orderByDesc((item) => orderBy[0](item));
      } else {
        result = result.orderBy((item) => orderBy[0](item));
      }
    }
    return result;
  }
}

export interface ISharedDataInfo<T extends ISharedDataBase<string | number>> {
  serviceKey: string;
  getDataAsync: (changeKeys?: T["__valueKey"][]) => Promise<T[]>;
  orderBy: [(data: T) => any, "asc" | "desc"][];
  filter?: any; // 이 값이 동일한 요청들만 변경이벤트 발생
}

interface ISharedDataInnerInfo<T extends ISharedDataBase<string | number>> {
  getter: ISharedDataInfo<T>;
  listenerKey?: string;
  signal?: WritableSignal<T[]>;
}

export interface ISharedDataBase<VK extends string | number> {
  __valueKey: VK;
  __searchText: string;
  __isHidden: boolean;
  __parentKey?: VK;
}

export class SdSharedDataChangeEvent extends SdServiceEventListenerBase<
  { name: string; filter: any },
  (string | number)[] | undefined
> {}
