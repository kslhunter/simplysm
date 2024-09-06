import {ChangeDetectorRef, inject, Injectable} from "@angular/core";
import {SdServiceFactoryProvider} from "./SdServiceFactoryProvider";
import {SdServiceEventListenerBase} from "@simplysm/sd-service-common";
import {Wait} from "@simplysm/sd-core-common";

/** @deprecated */
@Injectable({providedIn: "root"})
export class SdSharedDataProvider {
  #sdServiceFactory = inject(SdServiceFactoryProvider);

  #infoRecord: Record<string, ISharedDataInfo<ISharedDataBase<string | number>> | undefined> = {};
  #dataRecord: Record<string, {
    arr: ISharedDataBase<string | number>[];
    map: Map<string | number, ISharedDataBase<string | number>>;
  } | undefined> = {};
  #listenerRecord: Record<string, string | undefined> = {};
  #isProcessingRecord: Record<string, boolean | undefined> = {};
  #cdrRecord: Record<string, ChangeDetectorRef[] | undefined> = {};

  async clearAsync() {
    await Wait.until(() => {
      return Object.keys(this.#isProcessingRecord)
        .every((dataType) => !this.#isProcessingRecord[dataType]);
    });

    for (const dataType of Object.keys(this.#listenerRecord)) {
      // noinspection ES6MissingAwait
      void this.#sdServiceFactory
        .get(this.#infoRecord[dataType]!.serviceKey)
        .removeEventListenerAsync(this.#listenerRecord[dataType]!);
    }

    this.#infoRecord = {};
    this.#dataRecord = {};
    this.#listenerRecord = {};

    for (const dataType of Object.keys(this.#cdrRecord)) {
      for (const cdr of this.#cdrRecord[dataType]!) {
        cdr.markForCheck();
      }
    }
  }

  register<T extends ISharedDataBase<string | number>>(dataType: string, info: ISharedDataInfo<T>) {
    if (this.#infoRecord[dataType]) {
      throw new Error("SharedData 정보, 중복 등록 불가");
    }

    // noinspection ES6MissingAwait
    void this.#sdServiceFactory.get(info.serviceKey)
      .removeEventListenerAsync(this.#listenerRecord[dataType]!);

    this.#infoRecord[dataType] = info as any;

    delete this.#listenerRecord[dataType];
    delete this.#dataRecord[dataType];

    for (const cdr of this.#cdrRecord[dataType] ?? []) {
      cdr.markForCheck();
    }
  }

  async emitAsync(dataType: string, changeKeys?: (string | number)[]) {
    const info = this.#infoRecord[dataType];
    if (!info) throw new Error(`'${dataType}'에 대한 'SdSharedData' 로직 정보가 없습니다.`);

    await this.#sdServiceFactory.get(info.serviceKey).emitAsync(
      SdSharedDataChangeEvent,
      (item) => item === dataType,
      changeKeys
    );
  }

  async getDataAsync(dataType: string, cdr: ChangeDetectorRef): Promise<ISharedDataBase<string | number>[]> {
    await this.#loadDataAsync(dataType);
    await this.#addListenerAsync(dataType);

    this.#cdrRecord[dataType] = this.#cdrRecord[dataType] ?? [];
    this.#cdrRecord[dataType].push(cdr);

    return this.#dataRecord[dataType]!.arr;
  }

  async getDataMapAsync(dataType: string, cdr: ChangeDetectorRef): Promise<Map<number | string, ISharedDataBase<string | number>>> {
    await this.#loadDataAsync(dataType);
    await this.#addListenerAsync(dataType);

    this.#cdrRecord[dataType] = this.#cdrRecord[dataType] ?? [];
    this.#cdrRecord[dataType].push(cdr);

    return this.#dataRecord[dataType]!.map;
  }

  async #loadDataAsync(dataType: string): Promise<void> {
    if (this.#dataRecord[dataType]) return;

    if (this.#isProcessingRecord[dataType]) {
      await Wait.until(() => !this.#isProcessingRecord[dataType]);
    }
    this.#isProcessingRecord[dataType] = true;

    // 정보 등록 확인
    const info = this.#infoRecord[dataType];
    if (!info) throw new Error(`'${dataType}'에 대한 'SdSharedData' 로직 정보가 없습니다.`);

    let data = await info.getData();
    for (const orderBy of info.orderBy.reverse()) {
      data = orderBy[1] === "desc"
        ? data.orderByDesc((item) => orderBy[0](item))
        : data.orderBy((item) => orderBy[0](item));
    }
    this.#dataRecord[dataType] = {
      arr: data,
      map: data.toMap((item) => item.__valueKey)
    };

    this.#isProcessingRecord[dataType] = false;
  }

  async #addListenerAsync(dataType: string) {
    if (this.#listenerRecord[dataType] !== undefined) return;

    const info = this.#infoRecord[dataType];
    if (!info) throw new Error(`'${dataType}'에 대한 'SdSharedData' 로직 정보가 없습니다.`);

    this.#listenerRecord[dataType] = await this.#sdServiceFactory.get(info.serviceKey)
      .addEventListenerAsync(
        SdSharedDataChangeEvent,
        dataType,
        async (changeKeys) => {
          await this.#reloadAsync(dataType, changeKeys);
        }
      );
  }

  async #reloadAsync(dataType: string, changeKeys?: (string | number)[]) {
    const info = this.#infoRecord[dataType];
    if (!info) throw new Error(`'${dataType}'에 대한 'SdSharedData' 로직 정보가 없습니다.`);

    let currData = await info.getData(changeKeys);

    if (changeKeys) {
      // 삭제된 항목 제거 (DB에 없는 항목)
      const deleteKeys = changeKeys.filter((changeKey) => !currData.some((currItem) => currItem.__valueKey === changeKey));
      this.#dataRecord[dataType]!.arr.remove((item) => deleteKeys.includes(item.__valueKey));
      for (const deleteKey of deleteKeys) {
        this.#dataRecord[dataType]!.map.delete(deleteKey);
      }

      // 수정된 항목 변경
      for (const currItem of currData) {
        const currItemKey = currItem.__valueKey;

        const currItemIndex = this.#dataRecord[dataType]!.arr.findIndex((item) => item.__valueKey === currItemKey);
        if (currItemIndex >= 0) {
          this.#dataRecord[dataType]!.arr[currItemIndex] = currItem;
        }
        else {
          this.#dataRecord[dataType]!.arr.push(currItem);
        }

        this.#dataRecord[dataType]!.map.set(currItemKey, currItem);
      }

      // 재정렬
      if (currData.length > 0) {
        for (const orderBy of info.orderBy.reverse()) {
          if (orderBy[1] === "desc") {
            this.#dataRecord[dataType]!.arr.orderByDescThis((item) => orderBy[0](item));
          }
          else {
            this.#dataRecord[dataType]!.arr.orderByThis((item) => orderBy[0](item));
          }
        }
      }
    }
    // 모든항목 새로고침
    else {
      for (const orderBy of info.orderBy.reverse()) {
        currData = orderBy[1] === "desc" ? currData.orderByDesc((item) => orderBy[0](item))
          : currData.orderBy((item) => orderBy[0](item));
      }

      this.#dataRecord[dataType]!.arr.clear();
      this.#dataRecord[dataType]!.map.clear();
      this.#dataRecord[dataType]!.arr.push(...currData);
      for (const currItem of currData) {
        this.#dataRecord[dataType]!.map.set(currItem.__valueKey, currItem);
      }
    }

    for (const cdr of this.#cdrRecord[dataType] ?? []) {
      cdr.markForCheck();
    }
  }
}

export interface ISharedDataInfo<T extends ISharedDataBase<string | number>> {
  serviceKey: string;
  getData: (changeKeys?: (T["__valueKey"])[]) => T[] | Promise<T[]>;
  orderBy: [(data: T) => any, "asc" | "desc"][];
}

export interface ISharedDataBase<VK extends string | number> {
  __valueKey: VK;
  __searchText: string;
  __isHidden: boolean;
  __parentKey?: VK;
}

export class SdSharedDataChangeEvent extends SdServiceEventListenerBase<string, (string | number)[] | undefined> {
}