import { Injectable } from "@angular/core";
import { SdServiceFactoryProvider } from "./SdServiceFactoryProvider";
import { NeverEntryError, ObjectUtil, Wait } from "@simplysm/sd-core-common";
import { SdSharedDataChangeEvent } from "../commons";
import { SdRootProvider } from "../root-providers/SdRootProvider";

@Injectable({ providedIn: null })
export class SdSharedDataProvider {
  private get _dataInfoMap(): Map<string, ISharedDataInfo<any>> {
    this._root.data.sharedData = this._root.data.sharedData ?? {};
    this._root.data.sharedData.dataInfoMap = this._root.data.sharedData.dataInfoMap ?? new Map<string, ISharedDataInfo<any>>();
    return this._root.data.sharedData.dataInfoMap;
  }

  private get _dataChangeListenerMap(): Map<string, (() => void)[]> {
    this._root.data.sharedData = this._root.data.sharedData ?? {};
    this._root.data.sharedData.dataChangeListenerMap = this._root.data.sharedData.dataChangeListenerMap ?? new Map<string, (() => void)[]>();
    return this._root.data.sharedData.dataChangeListenerMap;
  }

  private get _dataMap(): Map<string, any[]> {
    this._root.data.sharedData = this._root.data.sharedData ?? {};
    this._root.data.sharedData.dataMap = this._root.data.sharedData.dataMap ?? new Map<string, any[]>();
    return this._root.data.sharedData.dataMap;
  }

  private get _dataMapMap(): Map<string, Map<number | string, any>> {
    this._root.data.sharedData = this._root.data.sharedData ?? {};
    this._root.data.sharedData.dataMapMap = this._root.data.sharedData.dataMapMap ?? new Map<string, Map<number | string, any>>();
    return this._root.data.sharedData.dataMapMap;
  }

  private get _isProcessingMap(): Map<string, boolean> {
    this._root.data.sharedData = this._root.data.sharedData ?? {};
    this._root.data.sharedData.isProcessingMap = this._root.data.sharedData.isProcessingMap ?? new Map<string, boolean>();
    return this._root.data.sharedData.isProcessingMap;
  }

  public constructor(private readonly _service: SdServiceFactoryProvider,
                     private readonly _root: SdRootProvider) {
  }

  public async clearAsync(): Promise<void> {
    for (const isProcessingMapKey of Array.from(this._isProcessingMap.keys())) {
      if (this._isProcessingMap.get(isProcessingMapKey)) {
        await Wait.true(() => !this._isProcessingMap.get(isProcessingMapKey));
      }
    }

    this._dataInfoMap.clear();
    this._dataChangeListenerMap.clear();
    this._dataMap.clear();
    this._dataMapMap.clear();
    this._isProcessingMap.clear();
  }

  public register<T extends ISharedDataBase>(dataType: string, info: ISharedDataInfo<T>): void {
    if (this._dataInfoMap.has(dataType)) {
      throw new NeverEntryError();
    }
    this._dataInfoMap.set(dataType, info);
  }

  public async getDataAsync(serviceKey: string, dataType: string): Promise<any[] | undefined> {
    await this._loadDataAsync(serviceKey, dataType);
    return this._dataMap.get(dataType);
  }

  public async getDataMapAsync(serviceKey: string, dataType: string): Promise<Map<number | string, any> | undefined> {
    await this._loadDataAsync(serviceKey, dataType);
    return this._dataMapMap.get(dataType);
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

  public emit(serviceKey: string, dataType: string, changes: { key: string | number; isDeleted: boolean }[]): void {
    this._service.emit(
      serviceKey,
      SdSharedDataChangeEvent,
      (item) => item.dataType === dataType,
      { changes }
    );
  }

  private async _loadDataAsync(serviceKey: string, dataType: string): Promise<void> {
    if (this._isProcessingMap.get(dataType)) {
      await Wait.true(() => !this._isProcessingMap.get(dataType));
    }
    this._isProcessingMap.set(dataType, true);

    if (!this._dataMap.has(dataType)) {
      const info = this._dataInfoMap.get(dataType);
      if (!info) throw new Error(`'${dataType}'에 대한 'SdSharedData' 로직 정보가 없습니다.`);

      const data = await info.getData();
      this._dataMap.set(dataType, data);
      this._dataMapMap.set(dataType, data.toMap((item) => info.getKey(item)));

      await this._service.on(
        serviceKey,
        SdSharedDataChangeEvent,
        { dataType },
        async (eventParam) => {
          const currData = this._dataMap.get(dataType);
          if (!currData) return;

          const currMapData = this._dataMapMap.get(dataType);
          if (!currMapData) return;

          // 삭제된 항목 제거
          const deletedEventItemKeys = eventParam.changes.filter((item) => item.isDeleted).map((item) => item.key);
          currData.remove((item: any) => deletedEventItemKeys.includes(info.getKey(item)));
          for (const deletedEventItemKey of deletedEventItemKeys) {
            currMapData.delete(deletedEventItemKey);
          }

          // 수정된 항목 변경
          const updatedEventItemKeys = eventParam.changes.filter((item) => !item.isDeleted).map((item) => item.key);
          const newData = await info.getData(updatedEventItemKeys);
          for (const newItem of newData) {
            const newKey = info.getKey(newItem);

            const currItem = currData.single((item) => info.getKey(item) === newKey);
            if (currItem !== undefined) {
              ObjectUtil.clear(currItem);
              Object.assign(currItem, newItem);
            }
            else {
              currData.push(newItem);
            }

            if (currMapData.has(newKey)) {
              const currMapItem = currMapData.get(newKey);
              ObjectUtil.clear(currMapItem);
              Object.assign(currMapItem, newItem);
            }
            else {
              currMapData.set(newKey, newItem);
            }
          }

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

interface ISharedDataInfo<T extends ISharedDataBase> {
  getData: (changeKeys?: (string | number)[]) => T[] | Promise<T[]>;
  getKey: (data: T) => string | number;
}

export interface ISharedDataBase {
  __valueKey: string | number;
  __searchText: string;
  __isHidden: boolean;
}