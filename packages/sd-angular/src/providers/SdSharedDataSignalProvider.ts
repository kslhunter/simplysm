import {inject, Injectable, signal, WritableSignal} from "@angular/core";
import {ISharedDataBase, SdSharedDataChangeEvent} from "./SdSharedDataProvider";
import {SdServiceFactoryProvider} from "./SdServiceFactoryProvider";

@Injectable({providedIn: "root"})
export class SdSharedDataSignalProvider {
  #sdServiceFactory = inject(SdServiceFactoryProvider);

  #infoMap = new Map<string, ISharedDataCache<ISharedDataBase<string | number>>>();

  register(dataType: string, info: ISharedDataSignalInfo<ISharedDataBase<string | number>>) {
    if (this.#infoMap.has(dataType)) {
      throw new Error(`'${dataType}' SharedData 정보, 중복 등록 불가`);
    }

    this.#infoMap.set(dataType, info);
  }

  async emitAsync(dataType: string, changeKeys?: (string | number)[]) {
    const info = this.#infoMap.get(dataType);
    if (!info) throw new Error(`'${dataType}'이/가 공유 데이터에 등록되어있지 않습니다.`);

    await this.#sdServiceFactory.get(info.serviceKey).emitAsync(
      SdSharedDataChangeEvent,
      (item) => item === dataType,
      changeKeys
    );
  }

  getSignal(dataType: string) {
    const info = this.#infoMap.get(dataType);
    if (!info) throw new Error(`'${dataType}'이/가 공유 데이터에 등록되어있지 않습니다.`);

    if (info.signal != null) return info.signal.asReadonly();
    info.signal = signal([]);

    (async () => {
      const data = await info.getData();
      info.signal!.set(info.after(data));

      info.listenerKey = await this.#sdServiceFactory.get(info.serviceKey)
        .addEventListenerAsync(
          SdSharedDataChangeEvent,
          dataType,
          async (changeKeys) => {
            await this.#reloadAsync(info, changeKeys);
          }
        );
    })().catch(err => {
      throw err;
    });

    return info.signal.asReadonly();
  }

  async #reloadAsync(info: ISharedDataCache<ISharedDataBase<string | number>>, changeKeys: (string | number)[] | undefined) {
    const currData = await info.getData(changeKeys);

    if (changeKeys) {
      info.signal!.update(v => {
        //-- 삭제항목
        let r = v.filter(item1 => (
          changeKeys.includes(item1.__valueKey) &&
          !currData.some(curr => curr.__valueKey === item1.__valueKey)
        ));

        //-- 수정항목
        for (const currItem of currData) {
          const rItem = r.single(item1 => item1.__valueKey === currItem.__valueKey);
          if (rItem) {
            Object.assign(rItem, currItem);
          }
          else {
            r.push(currItem);
          }
        }

        //-- after
        return info.after(r);
      });
    }
    else {
      info.signal!.set(info.after(currData));
    }
  }

  async refreshAsync() {
    await Array.from(this.#infoMap.values()).parallelAsync(async (info) => {
      if (info.signal != null) {
        const data = await info.getData();
        info.signal.set(info.after(data));
      }
    });
  }

  async clearAsync() {
    await Array.from(this.#infoMap.values())
      .filter(info => info.listenerKey != null)
      .parallelAsync(async (info) => {
        await this.#sdServiceFactory.get(info.serviceKey).removeEventListenerAsync(info.listenerKey!);
      });

    this.#infoMap.clear();
  }
}

export interface ISharedDataSignalInfo<T extends ISharedDataBase<string | number>> {
  //-- config
  serviceKey: string;
  getData: (changeKeys?: (T["__valueKey"])[]) => T[] | Promise<T[]>;
  after: (arr: T[]) => T[];
}

interface ISharedDataCache<T extends ISharedDataBase<string | number>> extends ISharedDataSignalInfo<T> {
  //-- after getSignal
  signal?: WritableSignal<T[]>;
  listenerKey?: string;
}