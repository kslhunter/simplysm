import { computed, ErrorHandler, inject, Injectable, signal, type Signal, type WritableSignal } from "@angular/core";
import { defineEvent } from "@simplysm/service-common";
import { obj, wait as waitUtil } from "@simplysm/core-common";
import { SdServiceClientFactoryProvider } from "./sd-service-client-factory.provider";
import "@simplysm/core-common";

export interface ISharedDataBase<TKey extends string | number> {
  __valueKey: TKey;
}

export interface ISharedDataInfo<T extends ISharedDataBase<string | number>> {
  serviceKey: string;
  getter: (changeKeys?: (string | number)[]) => Promise<T[]>;
  filter?: unknown;
  orderBy?: (a: T, b: T) => number;
}

export interface SharedDataHandle<T extends ISharedDataBase<string | number>> {
  items: Signal<T[]>;
  get(key: T["__valueKey"] | undefined): T | undefined;
}

export const SdSharedDataChangeEvent = defineEvent<
  { name: string; filter: unknown },
  (string | number)[] | undefined
>("SdSharedDataChange");

interface ISharedDataEntry<T extends ISharedDataBase<string | number>> {
  info: ISharedDataInfo<T>;
  itemsSignal: WritableSignal<T[]>;
  handle: SharedDataHandle<T>;
  listenerKey?: string;
  needsReload: boolean;
}

@Injectable()
export abstract class SdSharedDataProvider<T extends Record<string, ISharedDataBase<string | number>>> {
  private readonly _clientFactory = inject(SdServiceClientFactoryProvider);
  private readonly _errorHandler = inject(ErrorHandler);

  readonly loadingCount: WritableSignal<number> = signal(0);

  private readonly _entries = new Map<string, ISharedDataEntry<any>>();

  abstract initialize(): void;

  register<K extends string & keyof T>(name: K, info: ISharedDataInfo<T[K]>): void {
    const existing = this._entries.get(name as string);
    if (existing != null) {
      // 기존 리스너 키 초기화
      if (existing.listenerKey != null) {
        const client = this._clientFactory.get(existing.info.serviceKey);
        void client.removeListener(existing.listenerKey);
        existing.listenerKey = undefined;
      }
      existing.info = info;
      existing.needsReload = true;
    } else {
      const itemsSignal = signal<T[K][]>([]);
      const itemsMapComputed = computed(() =>
        itemsSignal().toMap((i) => i.__valueKey),
      );

      const handle: SharedDataHandle<T[K]> = {
        items: itemsSignal.asReadonly(),
        get: (key: T[K]["__valueKey"] | undefined) => {
          if (key == null) return undefined;
          return itemsMapComputed().get(key);
        },
      };

      this._entries.set(name as string, {
        info,
        itemsSignal,
        handle,
        needsReload: true,
      });
    }
  }

  getHandle<K extends string & keyof T>(name: K): SharedDataHandle<T[K]> {
    const entry = this._entries.get(name as string);
    if (entry == null) {
      throw new Error(`등록되지 않은 공유 데이터: ${name as string}`);
    }

    if (entry.needsReload) {
      entry.needsReload = false;
      this._loadAndListen(name as string, entry);
    }

    return entry.handle;
  }

  async emitAsync<K extends string & keyof T>(
    name: K,
    changeKeys?: (string | number)[],
  ): Promise<void> {
    const entry = this._entries.get(name as string);
    if (entry == null) {
      throw new Error(`등록되지 않은 공유 데이터: ${name as string}`);
    }

    const client = this._clientFactory.get(entry.info.serviceKey);
    await client.emitEvent(
      SdSharedDataChangeEvent,
      (item) => item.name === (name as string) && obj.equal(item.filter, entry.info.filter),
      changeKeys,
    );
  }

  async wait(): Promise<void> {
    await waitUtil.until(() => this.loadingCount() <= 0);
  }

  private _loadAndListen(name: string, entry: ISharedDataEntry<any>): void {
    this.loadingCount.update((v) => v + 1);

    // 비동기 로드
    void entry.info
      .getter()
      .then(async (data: any[]) => {
        entry.itemsSignal.set(data);

        // 이벤트 리스너 등록
        if (entry.listenerKey == null) {
          const client = this._clientFactory.get(entry.info.serviceKey);
          entry.listenerKey = await client.addListener(
            SdSharedDataChangeEvent,
            { name, filter: entry.info.filter },
            async (changeKeys) => {
              await this._onEvent(name, entry, changeKeys);
            },
          );
        }
      })
      .catch((err) => {
        this._errorHandler.handleError(err);
      })
      .finally(() => {
        this.loadingCount.update((v) => v - 1);
      });
  }

  private async _onEvent(
    name: string,
    entry: ISharedDataEntry<any>,
    changeKeys: (string | number)[] | undefined,
  ): Promise<void> {
    this.loadingCount.update((v) => v + 1);

    try {
      if (changeKeys == null) {
        // 전체 리로드
        const data = await entry.info.getter();
        entry.itemsSignal.set(data);
      } else {
        // 부분 업데이트
        const newItems = await entry.info.getter(changeKeys);
        const currentItems = entry.itemsSignal();

        // 변경된 키를 제거하고 새 항목 추가
        const filtered = currentItems.filter(
          (item: any) => !changeKeys.includes(item.__valueKey),
        );
        const merged = [...filtered, ...newItems];

        // orderBy 적용
        if (entry.info.orderBy != null) {
          merged.sort(entry.info.orderBy);
        }

        entry.itemsSignal.set(merged);
      }
    } finally {
      this.loadingCount.update((v) => v - 1);
    }
  }
}
