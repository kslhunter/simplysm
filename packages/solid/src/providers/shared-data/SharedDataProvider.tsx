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

/**
 * 공유 데이터 Provider
 *
 * @remarks
 * - ServiceClientProvider와 NotificationProvider 내부에서 사용해야 함
 * - LoggerProvider가 있으면 fetch 실패를 로거에도 기록
 * - configure() 호출 전: wait, busy, configure만 접근 가능. 데이터 접근 시 throw
 * - configure() 호출 후: definitions의 각 key마다 서버 이벤트 리스너를 등록하여 실시간 동기화
 * - 동시 fetch 호출 시 version counter로 데이터 역전 방지
 * - fetch 실패 시 사용자에게 danger 알림 표시
 * - cleanup 시 모든 이벤트 리스너 자동 해제
 *
 * @example
 * ```tsx
 * <SharedDataProvider>
 *   <App />
 * </SharedDataProvider>
 *
 * // 자식 컴포넌트에서 나중에 설정:
 * useSharedData().configure(() => ({
 *   users: {
 *     serviceKey: "main",
 *     fetch: async (changeKeys) => fetchUsers(changeKeys),
 *     getKey: (item) => item.id,
 *     orderBy: [[(item) => item.name, "asc"]],
 *   },
 * }));
 * ```
 */
export function SharedDataProvider(props: { children: JSX.Element }): JSX.Element {
  const serviceClient = useServiceClient();
  const notification = useNotification();
  const logger = useLogger();

  let configured = false;
  const [busyCount, setBusyCount] = createSignal(0);
  const busy: Accessor<boolean> = () => busyCount() > 0;

  const signalMap = new Map<string, ReturnType<typeof createSignal<unknown[]>>>();
  const memoMap = new Map<string, Accessor<Map<string | number, unknown>>>();
  const listenerKeyMap = new Map<string, string>();
  const versionMap = new Map<string, number>();
  const accessors: Record<string, SharedDataAccessor<unknown>> = {};
  let currentDefinitions: Record<string, SharedDataDefinition<unknown>> | undefined;

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

    setBusyCount((c) => c + 1);
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
      setBusyCount((c) => c - 1);
    }
  }

  async function wait(): Promise<void> {
    // eslint-disable-next-line solid/reactivity -- waitUntil은 폴링 기반이므로 tracked scope 불필요
    await waitUntil(() => busyCount() <= 0);
  }

  function configure(
    fn: (
      origin: Record<string, SharedDataDefinition<unknown>>,
    ) => Record<string, SharedDataDefinition<unknown>>,
  ): void {
    if (configured) {
      throw new Error("SharedDataProvider: configure()는 1회만 호출할 수 있습니다");
    }
    configured = true;

    const definitions = fn({});
    currentDefinitions = definitions;

    for (const [name, def] of Object.entries(definitions)) {
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
        .addEventListener(
          SharedDataChangeEvent,
          { name, filter: def.filter },
          async (changeKeys) => {
            await loadData(name, def, changeKeys);
          },
        )
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
        getKey: def.getKey,
        getSearchText: def.getSearchText,
        getIsHidden: def.getIsHidden,
        getParentKey: def.getParentKey,
      };
    }
  }

  onCleanup(() => {
    if (!currentDefinitions) return;
    for (const [name] of Object.entries(currentDefinitions)) {
      const listenerKey = listenerKeyMap.get(name);
      if (listenerKey != null) {
        const def = currentDefinitions[name];
        const client = serviceClient.get(def.serviceKey);
        void client.removeEventListener(listenerKey);
      }
    }
  });

  const KNOWN_KEYS = new Set(["wait", "busy", "configure"]);

  // Proxy: configure 전 데이터 접근 시 throw
  const contextValue = new Proxy(
    { wait, busy, configure } as SharedDataValue<Record<string, unknown>>,
    {
      get(target, prop: string) {
        if (KNOWN_KEYS.has(prop)) {
          return target[prop];
        }
        if (!configured) {
          throw new Error("SharedDataProvider: configure()를 먼저 호출해야 합니다");
        }
        return accessors[prop];
      },
    },
  );

  return (
    <SharedDataContext.Provider value={contextValue}>{props.children}</SharedDataContext.Provider>
  );
}
