import { ChangeDetectorRef, inject, Injectable, ViewRef } from "@angular/core";
import { SdServiceEventListenerBase } from "@simplysm/sd-service-common";
import { SdServiceFactoryProvider } from "./SdServiceFactoryProvider";
import { DateOnly, DateTime, Time, Wait } from "@simplysm/sd-core-common";

export function getSharedData<T extends Record<string, ISharedDataBase<string | number>>, K extends keyof T>(
  name: K,
): T[K][] {
  const provider = inject(SdSharedDataProvider);
  const cdr = inject(ChangeDetectorRef, { optional: true }) ?? undefined;

  return provider.getData(name as string, cdr).arr;
}

export async function waitSharedData() {
  const provider = inject(SdSharedDataProvider);
  await Wait.until(() => provider.loadingCount < 1);
}

export function getSharedDataMap<T extends Record<string, ISharedDataBase<string | number>>, K extends keyof T>(
  name: K,
): Map<T[K]["__valueKey"], T[K]> {
  const provider = inject(SdSharedDataProvider);
  const cdr = inject(ChangeDetectorRef, { optional: true }) ?? undefined;

  return provider.getData(name as string, cdr).map;
}

export async function emitSharedDataChangedAsync<
  T extends Record<string, ISharedDataBase<string | number>>,
  K extends keyof T,
>(name: K, changeKeys?: T[K]["__valueKey"][]) {
  const provider = inject(SdSharedDataProvider);
  await provider.emitAsync(name as string, changeKeys);
}

@Injectable({ providedIn: "root" })
export class SdSharedDataProvider<T extends Record<string, any>> {
  #sdServiceFactory = inject(SdServiceFactoryProvider);

  #infoMap = new Map<keyof T, ISharedDataInnerInfo<T[keyof T]>>();

  loadingCount = 0;

  async clearAsync() {
    for (const info of this.#infoMap.values()) {
      info.data?.arr.clear();
      info.data?.map.clear();
      if (info.cdrSet) {
        for (const cdr of info.cdrSet) {
          cdr.markForCheck();
        }
      }

      if (info.listenerKey == null) continue;

      await this.#sdServiceFactory.get(info.getter.serviceKey).removeEventListenerAsync(info.listenerKey);
    }

    this.#infoMap.clear();
  }

  register<K extends keyof T>(name: K, getter: ISharedDataInfo<T[K]>) {
    if (this.#infoMap.has(name))
      throw new Error(`'${name as string}'에 대한 공유데이터 정보가 이미 등록되이 있습니다.`);
    this.#infoMap.set(name, { getter: getter as any });
  }

  async emitAsync<K extends keyof T>(name: K, changeKeys?: T[K]["__valueKey"][]) {
    const info = this.#infoMap.get(name);
    if (!info) throw new Error(`'${name as string}'에 대한 공유데이터 정보가 없습니다.`);

    await this.#sdServiceFactory
      .get(info.getter.serviceKey)
      .emitAsync(SdSharedDataChangeEvent, (item) => item === name, changeKeys);
  }

  getData<K extends keyof T>(
    name: K,
    cdr?: ChangeDetectorRef,
  ): {
    arr: T[K][];
    map: Map<T[K]["__valueKey"], T[K]>;
  } {
    const info = this.#infoMap.get(name);
    if (!info) throw new Error(`'${name as string}'에 대한 공유데이터 정보가 없습니다.`);

    //-- cdr
    if (cdr) {
      info.cdrSet = info.cdrSet ?? new Set();
      if (!info.cdrSet.has(cdr)) {
        info.cdrSet.add(cdr);
        (cdr as ViewRef).onDestroy(() => {
          info.cdrSet!.delete(cdr);
        });
      }
    }

    //-- listener
    if (info.listenerKey == null) {
      info.listenerKey = void this.#sdServiceFactory
        .get(info.getter.serviceKey)
        .addEventListenerAsync(SdSharedDataChangeEvent, name as string, async (changeKeys) => {
          await this.#loadDataAsync(name, changeKeys);
        });
    }

    //-- data
    if (!info.data) {
      info.data = {
        arr: [],
        map: new Map(),
      };
      void this.#loadDataAsync(name);
    }

    return info.data as any;
  }

  async #loadDataAsync<K extends keyof T>(name: K, changeKeys?: T[K]["__valueKey"][]) {
    this.loadingCount++;
    try {
      const info = this.#infoMap.get(name);
      if (!info) throw new Error(`'${name as string}'에 대한 공유데이터 로직 정보가 없습니다.`);
      if (!info.data) throw new Error(`'${name as string}'에 대한 공유데이터 저장소가 없습니다.`);

      const resData = await info.getter.getDataAsync(changeKeys);

      if (!changeKeys) {
        this.#orderingThis(resData, info.getter.orderBy);
        info.data.arr.clear();
        info.data.map.clear();
        info.data.arr.push(...resData);
        for (const resDataItem of resData) {
          info.data.map.set(resDataItem.__valueKey, resDataItem);
        }
      } else {
        // 삭제된 항목 제거 (DB에 없는 항목)
        const deleteKeys = changeKeys.filter(
          (changeKey) => !resData.some((resItem) => resItem.__valueKey === changeKey),
        );
        info.data.arr.remove((item) => deleteKeys.includes(item.__valueKey));
        for (const deleteKey of deleteKeys) {
          info.data.map.delete(deleteKey);
        }

        // 수정된 항목 변경
        for (const resItem of resData) {
          const currItemKey = resItem.__valueKey;

          const resItemIndex = info.data.arr.findIndex((item) => item.__valueKey === currItemKey);
          if (resItemIndex >= 0) {
            info.data.arr[resItemIndex] = resItem;
          } else {
            info.data.arr.push(resItem);
          }
          info.data.map.set(currItemKey, resItem);
        }

        // 재정렬
        this.#orderingThis(info.data.arr as any[], info.getter.orderBy);
      }

      if (info.cdrSet) {
        for (const cdr of info.cdrSet) {
          cdr.markForCheck();
        }
      }
    } catch (err) {
      this.loadingCount--;
      throw err;
    }
  }

  #orderingThis<TT extends T[keyof T]>(
    data: TT[],
    orderByList: [(data: TT) => string | number | DateOnly | DateTime | Time | undefined, "asc" | "desc"][],
  ): void {
    for (const orderBy of orderByList.reverse()) {
      if (orderBy[1] === "desc") {
        data.orderByDescThis((item) => orderBy[0](item));
      } else {
        data.orderByThis((item) => orderBy[0](item));
      }
    }
  }
}

export interface ISharedDataInfo<T extends ISharedDataBase<string | number>> {
  serviceKey: string;
  getDataAsync: (changeKeys?: T["__valueKey"][]) => Promise<T[]>;
  orderBy: [(data: T) => any, "asc" | "desc"][];
}

interface ISharedDataInnerInfo<T extends ISharedDataBase<string | number>> {
  getter: ISharedDataInfo<T>;
  cdrSet?: Set<ChangeDetectorRef>;
  listenerKey?: string;
  data?: {
    arr: ISharedDataBase<string | number>[];
    map: Map<string | number, ISharedDataBase<string | number>>;
  };
}

export interface ISharedDataBase<VK extends string | number> {
  __valueKey: VK;
  __searchText: string;
  __isHidden: boolean;
  __parentKey?: VK;
}

export class SdSharedDataChangeEvent extends SdServiceEventListenerBase<string, (string | number)[] | undefined> {}
