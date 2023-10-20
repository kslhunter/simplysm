import {ChangeDetectorRef, inject, Injectable} from "@angular/core";
import {SdServiceFactoryProvider} from "./SdServiceFactoryProvider";
import {SdServiceEventListenerBase} from "@simplysm/sd-service-common";
import {Wait} from "@simplysm/sd-core-common";

@Injectable({providedIn: "root"})
export class SdSharedDataProvider {
  private readonly _sdServiceFactory = inject(SdServiceFactoryProvider);

  private _infoRecord: Record<string, ISharedDataInfo<ISharedDataBase<string | number>> | undefined> = {};
  private _dataRecord: Record<string, {
    arr: ISharedDataBase<string | number>[];
    map: Map<string | number, ISharedDataBase<string | number>>;
  } | undefined> = {};
  private _listenerRecord: Record<string, string | undefined> = {};
  private readonly _isProcessingRecord: Record<string, boolean | undefined> = {};
  private readonly _cdrRecord: Record<string, ChangeDetectorRef[] | undefined> = {};

  public async clearAsync(): Promise<void> {
    await Wait.until(() => {
      return Object.keys(this._isProcessingRecord)
        .every((dataType) => !this._isProcessingRecord[dataType]);
    });

    for (const dataType of Object.keys(this._listenerRecord)) {
      // noinspection ES6MissingAwait
      void this._sdServiceFactory
        .get(this._infoRecord[dataType]!.serviceKey)
        .removeEventListenerAsync(this._listenerRecord[dataType]!);
    }

    this._infoRecord = {};
    this._dataRecord = {};
    this._listenerRecord = {};

    for (const dataType of Object.keys(this._cdrRecord)) {
      for (const cdr of this._cdrRecord[dataType]!) {
        cdr.markForCheck();
      }
    }
  }

  public register<T extends ISharedDataBase<string | number>>(dataType: string, info: ISharedDataInfo<T>): void {
    if (this._infoRecord[dataType]) {
      throw new Error("SharedData 정보, 중복 등록 불가");
    }

    // noinspection ES6MissingAwait
    void this._sdServiceFactory.get(info.serviceKey)
      .removeEventListenerAsync(this._listenerRecord[dataType]!);

    this._infoRecord[dataType] = info as any;

    delete this._listenerRecord[dataType];
    delete this._dataRecord[dataType];

    for (const cdr of this._cdrRecord[dataType] ?? []) {
      cdr.markForCheck();
    }
  }

  public async emitAsync(dataType: string, changeKeys?: (string | number)[]): Promise<void> {
    const info = this._infoRecord[dataType];
    if (!info) throw new Error(`'${dataType}'에 대한 'SdSharedData' 로직 정보가 없습니다.`);

    await this._sdServiceFactory.get(info.serviceKey).emitAsync(
      SdSharedDataChangeEvent,
      (item) => item === dataType,
      changeKeys
    );
  }

  public async getDataAsync(dataType: string, cdr: ChangeDetectorRef): Promise<ISharedDataBase<string | number>[]> {
    await this._loadDataAsync(dataType);
    await this._addListenerAsync(dataType);

    this._cdrRecord[dataType] = this._cdrRecord[dataType] ?? [];
    this._cdrRecord[dataType]!.push(cdr);

    return this._dataRecord[dataType]!.arr;
  }

  public async getDataMapAsync(dataType: string, cdr: ChangeDetectorRef): Promise<Map<number | string, ISharedDataBase<string | number>>> {
    await this._loadDataAsync(dataType);
    await this._addListenerAsync(dataType);

    this._cdrRecord[dataType] = this._cdrRecord[dataType] ?? [];
    this._cdrRecord[dataType]!.push(cdr);

    return this._dataRecord[dataType]!.map;
  }

  private async _loadDataAsync(dataType: string): Promise<void> {
    if (this._dataRecord[dataType]) return;

    if (this._isProcessingRecord[dataType]) {
      await Wait.until(() => !this._isProcessingRecord[dataType]);
    }
    this._isProcessingRecord[dataType] = true;

    // 정보 등록 확인
    const info = this._infoRecord[dataType];
    if (!info) throw new Error(`'${dataType}'에 대한 'SdSharedData' 로직 정보가 없습니다.`);

    let data = await info.getData();
    for (const orderBy of info.orderBy.reverse()) {
      data = orderBy[1] === "desc"
        ? data.orderByDesc((item) => orderBy[0](item))
        : data.orderBy((item) => orderBy[0](item));
    }
    this._dataRecord[dataType] = {
      arr: data,
      map: data.toMap((item) => item.__valueKey)
    };

    this._isProcessingRecord[dataType] = false;
  }

  private async _addListenerAsync(dataType: string) {
    if (this._listenerRecord[dataType] !== undefined) return;

    const info = this._infoRecord[dataType];
    if (!info) throw new Error(`'${dataType}'에 대한 'SdSharedData' 로직 정보가 없습니다.`);

    this._listenerRecord[dataType] = await this._sdServiceFactory.get(info.serviceKey)
      .addEventListenerAsync(
        SdSharedDataChangeEvent,
        dataType,
        async (changeKeys) => {
          await this._reloadAsync(dataType, changeKeys);
        }
      );
  }

  private async _reloadAsync(dataType: string, changeKeys?: (string | number)[]) {
    const info = this._infoRecord[dataType];
    if (!info) throw new Error(`'${dataType}'에 대한 'SdSharedData' 로직 정보가 없습니다.`);

    let currData = await info.getData(changeKeys);

    if (changeKeys) {
      // 삭제된 항목 제거 (DB에 없는 항목)
      const deleteKeys = changeKeys.filter((changeKey) => !currData.some((currItem) => currItem.__valueKey === changeKey));
      this._dataRecord[dataType]!.arr.remove((item) => deleteKeys.includes(item.__valueKey));
      for (const deleteKey of deleteKeys) {
        this._dataRecord[dataType]!.map.delete(deleteKey);
      }

      // 수정된 항목 변경
      for (const currItem of currData) {
        const currItemKey = currItem.__valueKey;

        const currItemIndex = this._dataRecord[dataType]!.arr.findIndex((item) => item.__valueKey === currItemKey);
        if (currItemIndex >= 0) {
          this._dataRecord[dataType]!.arr[currItemIndex] = currItem;
        }
        else {
          this._dataRecord[dataType]!.arr.push(currItem);
        }

        this._dataRecord[dataType]!.map.set(currItemKey, currItem);
      }
    }
    // 모든항목 새로고침
    else {
      for (const orderBy of info.orderBy.reverse()) {
        currData = orderBy[1] === "desc" ? currData.orderByDesc((item) => orderBy[0](item))
          : currData.orderBy((item) => orderBy[0](item));
      }

      this._dataRecord[dataType]!.arr.clear();
      this._dataRecord[dataType]!.map.clear();
      this._dataRecord[dataType]!.arr.push(...currData);
      for (const currItem of currData) {
        this._dataRecord[dataType]!.map.set(currItem.__valueKey, currItem);
      }
    }

    for (const cdr of this._cdrRecord[dataType] ?? []) {
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