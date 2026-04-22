import { computed, ErrorHandler, inject, Injectable, signal, type Signal, type WritableSignal } from "@angular/core";
import { defineEvent } from "@simplysm/service-common";
import { obj, wait as waitUtil } from "@simplysm/core-common";
import { SdServiceClientFactoryProvider } from "../service-client/sd-service-client-factory.provider";
import "@simplysm/core-common";

export interface SharedDataBase<TKey extends string | number> {
  __valueKey: TKey;
  __searchText: string;
  __isHidden: boolean;
  __parentKey?: TKey;
}

export interface SharedDataInfo<T extends SharedDataBase<string | number>> {
  serviceKey: string;
  getter: (changeKeys?: (string | number)[]) => Promise<T[]>;
  filter?: unknown;
  orderBy?: (a: T, b: T) => number;
}

export interface SharedDataHandle<T extends SharedDataBase<string | number>> {
  items: Signal<T[]>;
  get(key: T["__valueKey"] | undefined): T | undefined;
}

export const SdSharedDataChangeEvent = defineEvent<
  { name: string; filter: unknown },
  (string | number)[] | undefined
>("SdSharedDataChange");

interface SharedDataEntry<T extends SharedDataBase<string | number>> {
  info: SharedDataInfo<T>;
  itemsSignal: WritableSignal<T[]>;
  handle: SharedDataHandle<T>;
  listenerKey?: string;
  generation: number;
  needsReload: boolean;
  isLoading: boolean;
}

@Injectable()
export abstract class SdSharedDataProvider<T extends Record<string, SharedDataBase<string | number>>> {
  protected readonly _sdServiceClientFactory = inject(SdServiceClientFactoryProvider);
  protected readonly _errorHandler = inject(ErrorHandler);

  readonly loadingCount: WritableSignal<number> = signal(0);

  private readonly _entries = new Map<string, SharedDataEntry<any>>();

  abstract initialize(): void;

  register<K extends string & keyof T>(name: K, info: SharedDataInfo<T[K]>): void {
    const existing = this._entries.get(name);
    if (existing != null) {
      // 기존 리스너 키 초기화 + generation 증가로 이전 이벤트 무시
      if (existing.listenerKey != null) {
        const client = this._sdServiceClientFactory.get(existing.info.serviceKey);
        void client.removeListener(existing.listenerKey);
        existing.listenerKey = undefined;
      }
      existing.generation++;
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

      this._entries.set(name, {
        info,
        itemsSignal,
        handle,
        generation: 0,
        needsReload: true,
        isLoading: false,
      });
    }
  }

  getHandle<K extends string & keyof T>(name: K): SharedDataHandle<T[K]> {
    const entry = this._entries.get(name);
    if (entry == null) {
      throw new Error(`등록되지 않은 공유 데이터: ${name}`);
    }

    if (entry.needsReload && !entry.isLoading) {
      entry.needsReload = false;
      this._loadAndListen(name, entry);
    }

    return entry.handle;
  }

  async emitAsync<K extends string & keyof T>(
    name: K,
    changeKeys?: (string | number)[],
  ): Promise<void> {
    const entry = this._entries.get(name);
    if (entry == null) {
      throw new Error(`등록되지 않은 공유 데이터: ${name}`);
    }

    const client = this._sdServiceClientFactory.get(entry.info.serviceKey);
    const event = client.getEvent<typeof SdSharedDataChangeEvent>("SdSharedDataChange");
    await event.emit(
      (item) => item.name === (name as string) && obj.equal(item.filter, entry.info.filter),
      changeKeys,
    );
  }

  async wait(): Promise<void> {
    await waitUtil.until(() => this.loadingCount() <= 0);
  }

  private _loadAndListen(name: string, entry: SharedDataEntry<any>): void {
    entry.isLoading = true;
    const capturedGeneration = entry.generation;
    this.loadingCount.update((v) => v + 1);

    // 비동기 로드
    void entry.info
      .getter()
      .then(async (data: any[]) => {
        // register 재호출로 generation이 변경되었으면 결과를 무시
        if (entry.generation !== capturedGeneration) return;

        entry.itemsSignal.set(data);

        // 이벤트 리스너 등록
        if (entry.listenerKey == null) {
          const client = this._sdServiceClientFactory.get(entry.info.serviceKey);
          const event = client.getEvent<typeof SdSharedDataChangeEvent>("SdSharedDataChange");
          entry.listenerKey = await event.addListener(
            { name, filter: entry.info.filter },
            async (changeKeys) => {
              await this._onEvent(name, entry, changeKeys, capturedGeneration);
            },
          );
        }
      })
      .catch((err) => {
        this._errorHandler.handleError(err);
      })
      .finally(() => {
        this.loadingCount.update((v) => v - 1);
        entry.isLoading = false;
        if (entry.needsReload) {
          entry.needsReload = false;
          this._loadAndListen(name, entry);
        }
      });
  }

  private async _onEvent(
    name: string,
    entry: SharedDataEntry<any>,
    changeKeys: (string | number)[] | undefined,
    generation: number,
  ): Promise<void> {
    // register 재호출로 generation이 변경되었으면 이벤트 무시
    if (entry.generation !== generation) return;

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

        // 변경된 키를 제거하고 새 항목 추가 (String 변환으로 타입 혼재 방지)
        const changeKeySet = new Set(changeKeys.map(String));
        const filtered = currentItems.filter(
          (item: any) => !changeKeySet.has(String(item.__valueKey)),
        );
        const merged = [...filtered, ...newItems];

        // orderBy 적용
        if (entry.info.orderBy != null) {
          merged.sort(entry.info.orderBy);
        }

        entry.itemsSignal.set(merged);
      }
    } catch (err) {
      this._errorHandler.handleError(err);
    } finally {
      this.loadingCount.update((v) => v - 1);
    }
  }
}
