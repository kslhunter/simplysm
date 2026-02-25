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
 * Shared data Provider.
 *
 * @remarks
 * - Must be used inside ServiceClientProvider and NotificationProvider
 * - Logs fetch failures to logger if LoggerProvider is present
 * - Before configure(): only wait, busy, configure are accessible. Data access throws
 * - After configure(): registers definitions. Registers server event listeners + fetch on first items()/get() access per key (lazy)
 * - Prevents data inversion on concurrent fetch calls via version counter
 * - Displays danger notification to the user on fetch failure
 * - Automatically releases all event listeners on cleanup
 *
 * @example
 * ```tsx
 * <SharedDataProvider>
 *   <App />
 * </SharedDataProvider>
 *
 * // Configure later in a child component:
 * useSharedData().configure(() => ({
 *   users: {
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
    // CR-1: Prevent data inversion on concurrent calls via version counter
    const currentVersion = (versionMap.get(name) ?? 0) + 1;
    versionMap.set(name, currentVersion);

    setBusyCount((c) => c + 1);
    try {
      const signal = signalMap.get(name);
      if (!signal) throw new Error(`No shared data store found for '${name}'.`);

      const [, setItems] = signal;
      const resData = await def.fetch(changeKeys);

      // CR-1: Ignore stale responses
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
      // CR-2: Notify user on fetch failure
      logger.error(`SharedData '${name}' fetch failed:`, err);
      notification.danger(
        "Shared data load failed",
        err instanceof Error ? err.message : `Error occurred while loading '${name}' data.`,
      );
    } finally {
      setBusyCount((c) => c - 1);
    }
  }

  async function wait(): Promise<void> {
    // eslint-disable-next-line solid/reactivity -- waitUntil is polling-based, so tracked scope is unnecessary
    await waitUntil(() => busyCount() <= 0);
  }

  function configure(
    fn: (
      origin: Record<string, SharedDataDefinition<unknown>>,
    ) => Record<string, SharedDataDefinition<unknown>>,
  ): void {
    if (configured) {
      throw new Error("SharedDataProvider: configure() can only be called once");
    }
    configured = true;

    const definitions = fn({});
    currentDefinitions = definitions;

    for (const [name, def] of Object.entries(definitions)) {
      const [items, setItems] = createSignal<unknown[]>([]);
      // eslint-disable-next-line solid/reactivity -- Storing signal references in a Map is not a reactive access
      signalMap.set(name, [items, setItems]);

      const itemMap = createMemo(() => {
        const map = new Map<string | number, unknown>();
        for (const item of items()) {
          map.set(def.getKey(item as never), item);
        }
        return map;
      });
      // eslint-disable-next-line solid/reactivity -- Storing memo references in a Map is not a reactive access
      memoMap.set(name, itemMap);

      const client = serviceClient.get(def.serviceKey ?? "default");

      let initialized = false;

      function ensureInitialized() {
        if (initialized) return;
        initialized = true;

        void client
          .addEventListener(
            SharedDataChangeEvent,
            { name, filter: def.filter },
            async (changeKeys) => {
              await loadData(name, def, changeKeys);
            },
          )
          .then((key) => {
            if (disposed) {
              void client.removeEventListener(key);
            } else {
              listenerKeyMap.set(name, key);
            }
          });

        void loadData(name, def);
      }

      accessors[name] = {
        items: () => {
          ensureInitialized();
          return items();
        },
        get: (key: string | number | undefined) => {
          ensureInitialized();
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

  let disposed = false;

  onCleanup(() => {
    disposed = true;
    if (!currentDefinitions) return;
    for (const [name] of Object.entries(currentDefinitions)) {
      const listenerKey = listenerKeyMap.get(name);
      if (listenerKey != null) {
        const def = currentDefinitions[name];
        const client = serviceClient.get(def.serviceKey ?? "default");
        void client.removeEventListener(listenerKey);
      }
    }
  });

  const KNOWN_KEYS = new Set(["wait", "busy", "configure"]);

  // Proxy: throw on data access before configure
  const contextValue = new Proxy(
    { wait, busy, configure } as SharedDataValue<Record<string, unknown>>,
    {
      get(target, prop: string) {
        if (KNOWN_KEYS.has(prop)) {
          return target[prop];
        }
        if (!configured) {
          throw new Error("SharedDataProvider: configure() must be called first");
        }
        return accessors[prop];
      },
    },
  );

  return (
    <SharedDataContext.Provider value={contextValue}>{props.children}</SharedDataContext.Provider>
  );
}
