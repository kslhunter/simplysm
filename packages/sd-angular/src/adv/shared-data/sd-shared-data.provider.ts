import { inject, Injectable, type Signal, type WritableSignal } from "@angular/core";
import { SdServiceEventListenerBase } from "@simplysm/sd-service-common";
import { SdServiceFactoryProvider } from "../../providers/sd-service-factory.provider";
import { DateOnly, DateTime, ObjectUtil, Time, Wait } from "@simplysm/sd-core-common";
import { $computed, $signal } from "../../utils/$hooks";

export interface ISharedSignal<T extends ISharedDataBase<string | number>> extends Signal<T[]> {
  $get(key: T["__valueKey"] | undefined): T | undefined;

  // $wait(): Promise<void>;
}

@Injectable({ providedIn: "root" })
export class SdSharedDataProvider<T extends Record<string, ISharedDataBase<string | number>>> {
  #sdServiceFactory = inject(SdServiceFactoryProvider);

  #infoMap = new Map<keyof T & string, ISharedDataInnerInfo<any>>();

  loadingCount = 0;

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
        (item) => item.name === name && ObjectUtil.equal(item.filter, info.getter.filter),
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
      info.listenerKey = void this.#sdServiceFactory.get(info.getter.serviceKey).addEventListenerAsync(
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
      }
      else {
        info.signal.update((v) => {
          const r = [...v];

          // 삭제된 항목 제거 (DB에 없는 항목)
          const deleteKeys = changeKeys.filter(
            (changeKey) => !resData.some((resItem) => resItem.__valueKey === changeKey),
          );
          r.remove((item) => deleteKeys.includes(item.__valueKey));

          // 수정된 항목 변경
          for (const resItem of resData) {
            const currItemKey = resItem.__valueKey;

            const resItemIndex = r.findIndex((item) => item.__valueKey === currItemKey);
            if (resItemIndex >= 0) {
              r[resItemIndex] = resItem;
            }
            else {
              r.push(resItem);
            }
          }

          // 재정렬
          return this.#ordering(r, info.getter.orderBy);
        });
      }
      this.loadingCount--;
    }
    catch (err) {
      this.loadingCount--;
      throw err;
    }
  }

  #ordering<TT extends T[keyof T]>(
    data: TT[],
    orderByList: [(data: TT) => string | number | DateOnly | DateTime | Time | undefined, "asc" | "desc"][],
  ): TT[] {
    let result = [...data];
    for (const orderBy of orderByList.reverse()) {
      if (orderBy[1] === "desc") {
        result = result.orderByDesc((item) => orderBy[0](item));
      }
      else {
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
  filter: any;
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
> {
}
