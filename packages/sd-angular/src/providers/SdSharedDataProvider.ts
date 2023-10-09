import {Injectable} from "@angular/core";
import {NeverEntryError, ObjectUtil, Wait} from "@simplysm/sd-core-common";
import {SdServiceFactoryProvider} from "./SdServiceFactoryProvider";
import {SdServiceEventListenerBase} from "@simplysm/sd-service-common";

@Injectable({providedIn: "root"})
export class SdSharedDataProvider {
  private readonly _dataInfoMap = new Map<string, ISharedDataInfo<string | number, ISharedDataBase<string | number>>>();
  private readonly _dataChangeListenerMap = new Map<string, (() => void)[]>();
  private readonly _dataMap = new Map<string, any[]>();
  private readonly _dataMapMap = new Map<string, Map<number | string, any>>();
  private readonly _isProcessingMap = new Map<string, boolean>();

  public constructor(private readonly _serviceFactory: SdServiceFactoryProvider) {
  }

  public async clearAsync(): Promise<void> {
    for (const isProcessingMapKey of Array.from(this._isProcessingMap.keys())) {
      if (this._isProcessingMap.get(isProcessingMapKey)) {
        await Wait.until(() => !this._isProcessingMap.get(isProcessingMapKey));
      }
    }

    this._dataInfoMap.clear();
    this._dataChangeListenerMap.clear();
    this._dataMap.clear();
    this._dataMapMap.clear();
    this._isProcessingMap.clear();
  }

  public register<V extends string | number, T extends ISharedDataBase<V>>(dataType: string, info: ISharedDataInfo<V, T>): void {
    if (this._dataInfoMap.has(dataType)) {
      throw new NeverEntryError();
    }
    this._dataInfoMap.set(dataType, info as any);
  }

  public async getDataAsync(dataType: string): Promise<any[]> {
    await this._loadDataAsync(dataType);
    return this._dataMap.get(dataType)!;
  }

  public async getDataMapAsync(dataType: string): Promise<Map<number | string, any>> {
    await this._loadDataAsync(dataType);
    return this._dataMapMap.get(dataType)!;
  }

  public on(dataType: string, callback: () => void): void {
    if (this._dataChangeListenerMap.has(dataType)) {
      this._dataChangeListenerMap.get(dataType)!.push(callback);
    }
    else {
      this._dataChangeListenerMap.set(dataType, [callback]);
    }
  }

  public off(dataType: string, callback: () => void): void {
    const list = this._dataChangeListenerMap.get(dataType);
    if (!list) return;

    list.remove((item: Function) => item === callback);
  }

  public async emitAsync(dataType: string, changeKeys?: (string | number)[]): Promise<void> {
    const info = this._dataInfoMap.get(dataType);
    if (!info) throw new Error(`'${dataType}'에 대한 'SdSharedData' 로직 정보가 없습니다.`);

    await this._serviceFactory.get(info.serviceKey).emitAsync(
      SdSharedDataChangeEvent,
      (item) => item === dataType,
      changeKeys
    );
  }

  private async _loadDataAsync(dataType: string): Promise<void> {
    if (this._isProcessingMap.get(dataType)) {
      await Wait.until(() => !this._isProcessingMap.get(dataType));
    }
    this._isProcessingMap.set(dataType, true);

    if (!this._dataMap.has(dataType)) {
      const info = this._dataInfoMap.get(dataType);
      if (!info) throw new Error(`'${dataType}'에 대한 'SdSharedData' 로직 정보가 없습니다.`);

      let data = await info.getData();
      for (const orderBy of info.orderBy.reverse()) {
        data = orderBy[1] === "desc" ? data.orderByDesc((item) => orderBy[0](item))
          : data.orderBy((item) => orderBy[0](item));
      }
      this._dataMap.set(dataType, data);
      this._dataMapMap.set(dataType, data.toMap((item) => item.__valueKey));

      await this._serviceFactory.get(info.serviceKey).addEventListenerAsync(
        SdSharedDataChangeEvent,
        dataType,
        async (changeKeys) => {
          const currItems = this._dataMap.get(dataType);
          if (!currItems) return;

          const currMapData = this._dataMapMap.get(dataType);
          if (!currMapData) return;

          if (changeKeys) {
            const dbItems = await info.getData(changeKeys);

            // 삭제된 항목 제거 (DB에 없는 항목)
            const deleteKeys = changeKeys.filter((changeKey) => !dbItems.some((dbItem) => dbItem.__valueKey === changeKey));
            currItems.remove((item) => deleteKeys.includes(item.__valueKey));
            for (const deleteKey of deleteKeys) {
              currMapData.delete(deleteKey);
            }

            // 수정된 항목 변경
            for (const dbItem of dbItems) {
              const dbItemKey = dbItem.__valueKey;

              const currItem = currItems.single((item) => item.__valueKey === dbItemKey);
              if (currItem !== undefined) {
                ObjectUtil.clear(currItem);
                Object.assign(currItem, dbItem);
              }
              else {
                currItems.push(dbItem);
              }

              if (currMapData.has(dbItemKey)) {
                const currMapItem = currMapData.get(dbItemKey);
                ObjectUtil.clear(currMapItem);
                Object.assign(currMapItem, dbItem);
              }
              else {
                currMapData.set(dbItemKey, dbItem);
              }
            }
          }
          // 모든항목 새로고침
          else {
            const dbItems = await info.getData();

            currItems.clear();
            currMapData.clear();
            for (const newItem of dbItems) {
              currItems.push(newItem);
              const newKey = newItem.__valueKey;
              currMapData.set(newKey, newItem);
            }
          }

          let tempCurrItems = [...currItems];
          currItems.clear();

          for (const orderBy of info.orderBy.reverse()) {
            tempCurrItems = orderBy[1] === "desc" ? tempCurrItems.orderByDesc((item) => orderBy[0](item))
              : tempCurrItems.orderBy((item) => orderBy[0](item));
          }
          currItems.push(...tempCurrItems);

          const listeners = this._dataChangeListenerMap.get(dataType);
          if (listeners && listeners.length > 0) {
            for (const listener of listeners) {
              listener();
            }
          }
        }
      );
    }

    this._isProcessingMap.set(dataType, false);
  }
}

export interface ISharedDataInfo<V extends string | number, T extends ISharedDataBase<V>> {
  serviceKey: string;
  getData: (changeKeys?: V[]) => T[] | Promise<T[]>;
  orderBy: [(data: T) => any, "asc" | "desc"][];
}

export interface ISharedDataBase<V extends string | number> {
  __valueKey: V;
  __searchText: string;
  __isHidden: boolean;
}

export class SdSharedDataChangeEvent extends SdServiceEventListenerBase<string, (string | number)[] | undefined> {
}
