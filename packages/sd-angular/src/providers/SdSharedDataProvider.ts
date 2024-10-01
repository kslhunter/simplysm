import { inject, Injectable } from "@angular/core";
import { SdServiceEventListenerBase } from "@simplysm/sd-service-common";
import { SdServiceFactoryProvider } from "./SdServiceFactoryProvider";
import { DateOnly, DateTime, ObjectUtil, Time, Wait } from "@simplysm/sd-core-common";
import { $computed } from "../utils/$hooks";
import { $reactive } from "../utils/$reactive";

export interface ISharedReactive<T extends ISharedDataBase<string | number>> {
  readonly value: T[];
  $get(key: T["__valueKey"] | undefined): T | undefined;
  $wait(): Promise<void>;
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

  get$<K extends keyof T & string>(name: K): ISharedReactive<T[K]> {
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
    if (!info.reactive$) {
      info.reactive$ = $reactive([]);

      const computedMap$ = $computed(() => info.reactive$!.value.toMap((item) => item.__valueKey));
      info.reactive$["$get"] = (key: T[K]["__valueKey"]) => computedMap$.value.get(key);

      let loaded = false;
      info.reactive$["$wait"] = () => Wait.until(() => loaded);

      void (async () => {
        await this.#loadDataAsync(name);
        loaded = true;
      })();
    }

    return info.reactive$ as any;
  }

  async #loadDataAsync<K extends keyof T & string>(name: K, changeKeys?: T[K]["__valueKey"][]) {
    this.loadingCount++;
    try {
      const info = this.#infoMap.get(name);
      if (!info) throw new Error(`'${name}'에 대한 공유데이터 로직 정보가 없습니다.`);
      if (!info.reactive$) throw new Error(`'${name}'에 대한 공유데이터 저장소가 없습니다.`);

      const resData = await info.getter.getDataAsync(changeKeys);

      if (!changeKeys) {
        info.reactive$.value = this.#ordering(resData, info.getter.orderBy);
      } else {
        // 삭제된 항목 제거 (DB에 없는 항목)
        const deleteKeys = changeKeys.filter(
          (changeKey) => !resData.some((resItem) => resItem.__valueKey === changeKey),
        );
        info.reactive$.value.remove((item) => deleteKeys.includes(item.__valueKey));

        // 수정된 항목 변경
        for (const resItem of resData) {
          const currItemKey = resItem.__valueKey;

          const resItemIndex = info.reactive$.value.findIndex((item) => item.__valueKey === currItemKey);
          if (resItemIndex >= 0) {
            info.reactive$.value[resItemIndex] = resItem;
          } else {
            info.reactive$.value.push(resItem);
          }
        }

        // 재정렬
        info.reactive$.value = this.#ordering(info.reactive$.value, info.getter.orderBy);
      }
    } catch (err) {
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
  filter: any;
}

interface ISharedDataInnerInfo<T extends ISharedDataBase<string | number>> {
  getter: ISharedDataInfo<T>;
  listenerKey?: string;
  reactive$?: { value: T[] };
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
