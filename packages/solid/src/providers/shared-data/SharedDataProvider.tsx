import { type Accessor, type JSX, createMemo, createSignal, onCleanup } from "solid-js";
import { objEqual, waitUntil } from "@simplysm/core-common";
import {
  SharedDataContext,
  type SharedDataAccessor,
  type SharedDataDefinition,
  type SharedDataValue,
} from "./SharedDataContext";
import { SharedDataChangeEvent } from "./SharedDataChangeEvent";
import { useServiceClient } from "../ServiceClientContext";
import { useNotification } from "../../components/feedback/notification/NotificationContext";
import { useLogger } from "../../hooks/useLogger";

export function SharedDataProvider<TSharedData extends Record<string, unknown>>(props: {
  definitions: { [K in keyof TSharedData]: SharedDataDefinition<TSharedData[K]> };
  children: JSX.Element;
}): JSX.Element {
  const serviceClient = useServiceClient();
  const notification = useNotification();
  const logger = useLogger();

  const [loadingCount, setLoadingCount] = createSignal(0);
  const loading: Accessor<boolean> = () => loadingCount() > 0;

  const signalMap = new Map<string, ReturnType<typeof createSignal<unknown[]>>>();
  const memoMap = new Map<string, Accessor<Map<string | number, unknown>>>();
  const listenerKeyMap = new Map<string, string>();
  const versionMap = new Map<string, number>();

  function ordering<TT>(data: TT[], orderByList: [(item: TT) => unknown, "asc" | "desc"][]): TT[] {
    let result = [...data];
    for (const orderBy of [...orderByList].reverse()) {
      const selector = (item: TT) => orderBy[0](item) as string | number | undefined;
      if (orderBy[1] === "desc") {
        result = result.orderByDesc(selector);
      } else {
        result = result.orderBy(selector);
      }
    }
    return result;
  }

  async function loadData(
    name: string,
    def: SharedDataDefinition<unknown>,
    changeKeys?: Array<string | number>,
  ): Promise<void> {
    // CR-1: version counter로 동시 호출 시 데이터 역전 방지
    const currentVersion = (versionMap.get(name) ?? 0) + 1;
    versionMap.set(name, currentVersion);

    setLoadingCount((c) => c + 1);
    try {
      const signal = signalMap.get(name);
      if (!signal) throw new Error(`'${name}'에 대한 공유데이터 저장소가 없습니다.`);

      const [, setItems] = signal;
      const resData = await def.fetch(changeKeys);

      // CR-1: 오래된 응답은 무시
      if (versionMap.get(name) !== currentVersion) return;

      if (!changeKeys) {
        setItems(ordering(resData, def.orderBy));
      } else {
        setItems((prev) => {
          const filtered = prev.filter((item) => !changeKeys.includes(def.getKey(item as never)));
          filtered.push(...resData);
          return ordering(filtered, def.orderBy);
        });
      }
    } catch (err) {
      // CR-2: fetch 실패 시 사용자에게 알림
      logger.error(`SharedData '${name}' fetch failed:`, err);
      notification.danger(
        "공유 데이터 로드 실패",
        err instanceof Error ? err.message : `'${name}' 데이터를 불러오는 중 오류가 발생했습니다.`,
      );
    } finally {
      setLoadingCount((c) => c - 1);
    }
  }

  async function wait(): Promise<void> {
    // eslint-disable-next-line solid/reactivity -- waitUntil은 폴링 기반이므로 tracked scope 불필요
    await waitUntil(() => loadingCount() <= 0);
  }

  const accessors: Record<string, SharedDataAccessor<unknown>> = {};

  // eslint-disable-next-line solid/reactivity -- definitions는 초기 설정용으로 마운트 시 1회만 읽음
  for (const [name, def] of Object.entries(props.definitions) as [string, SharedDataDefinition<unknown>][]) {
    const [items, setItems] = createSignal<unknown[]>([]);
    // eslint-disable-next-line solid/reactivity -- signal 참조를 Map에 저장하는 것은 반응성 접근이 아님
    signalMap.set(name, [items, setItems]);

    const itemMap = createMemo(() => {
      const map = new Map<string | number, unknown>();
      for (const item of items()) {
        map.set(def.getKey(item as never), item);
      }
      return map;
    });
    // eslint-disable-next-line solid/reactivity -- memo 참조를 Map에 저장하는 것은 반응성 접근이 아님
    memoMap.set(name, itemMap);

    const client = serviceClient.get(def.serviceKey);
    void client
      .addEventListener(SharedDataChangeEvent, { name, filter: def.filter }, async (changeKeys) => {
        await loadData(name, def, changeKeys);
      })
      .then((key) => {
        listenerKeyMap.set(name, key);
      });

    void loadData(name, def);

    accessors[name] = {
      items,
      get: (key: string | number | undefined) => {
        if (key === undefined) return undefined;
        return itemMap().get(key);
      },
      emit: async (changeKeys?: Array<string | number>) => {
        await client.emitToServer(
          SharedDataChangeEvent,
          (info) => info.name === name && objEqual(info.filter, def.filter),
          changeKeys,
        );
      },
    };
  }

  onCleanup(() => {
    for (const [name] of Object.entries(props.definitions)) {
      const listenerKey = listenerKeyMap.get(name);
      if (listenerKey != null) {
        const def = (props.definitions as Record<string, SharedDataDefinition<unknown>>)[name];
        const client = serviceClient.get(def.serviceKey);
        void client.removeEventListener(listenerKey);
      }
    }
  });

  const contextValue = {
    ...accessors,
    wait,
    loading,
  } as SharedDataValue<Record<string, unknown>>;

  return <SharedDataContext.Provider value={contextValue}>{props.children}</SharedDataContext.Provider>;
}
