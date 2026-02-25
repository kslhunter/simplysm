import { type Accessor, createContext, useContext } from "solid-js";

/**
 * Shared data definition.
 *
 * @remarks
 * Passed to SharedDataProvider to set up server data subscriptions.
 */
export interface SharedDataDefinition<TData> {
  /** Service connection key (defaults to "default" if omitted) */
  serviceKey?: string;
  /** Data fetch function (partial refresh for specified changeKeys only) */
  fetch: (changeKeys?: Array<string | number>) => Promise<TData[]>;
  /** Function to extract the unique key from an item */
  getKey: (item: TData) => string | number;
  /** Sort criteria array (multiple criteria supported) */
  orderBy: [(item: TData) => unknown, "asc" | "desc"][];
  /** Server event filter (receives only events with matching filter among same-name events) */
  filter?: unknown;
  /** Function to extract search text from an item */
  getSearchText?: (item: TData) => string;
  /** Function to determine if an item is hidden */
  getIsHidden?: (item: TData) => boolean;
  /** Function to extract parent key from an item (tree structure support) */
  getParentKey?: (item: TData) => string | number | undefined;
}

/**
 * Shared data accessor.
 *
 * @remarks
 * Provides reactive access and change notifications for each data key.
 */
export interface SharedDataAccessor<TData> {
  /** Reactive items array */
  items: Accessor<TData[]>;
  /** Get a single item by key */
  get: (key: string | number | undefined) => TData | undefined;
  /** Propagate change event to server (triggers refetch for all subscribers) */
  emit: (changeKeys?: Array<string | number>) => Promise<void>;
  /** Function to extract the unique key from an item */
  getKey: (item: TData) => string | number;
  /** Function to extract search text from an item */
  getSearchText?: (item: TData) => string;
  /** Function to determine if an item is hidden */
  getIsHidden?: (item: TData) => boolean;
  /** Function to extract parent key from an item (tree structure support) */
  getParentKey?: (item: TData) => string | number | undefined;
}

/**
 * Shared data context value.
 *
 * @remarks
 * - Before configure: only wait, busy, configure are accessible. Data access throws
 * - After configure: includes SharedDataAccessor per data key and overall state management methods
 */
export type SharedDataValue<TSharedData extends Record<string, unknown>> = {
  [K in keyof TSharedData]: SharedDataAccessor<TSharedData[K]>;
} & {
  /** Wait until all initial fetches complete */
  wait: () => Promise<void>;
  /** Whether a fetch is in progress */
  busy: Accessor<boolean>;
  /** Set definitions to start data subscriptions (decorator pattern) */
  configure: (
    fn: (origin: {
      [K in keyof TSharedData]: SharedDataDefinition<TSharedData[K]>;
    }) => {
      [K in keyof TSharedData]: SharedDataDefinition<TSharedData[K]>;
    },
  ) => void;
};

/** Shared data Context */
export const SharedDataContext = createContext<SharedDataValue<Record<string, unknown>>>();

/**
 * Hook to access shared data.
 *
 * @throws Throws an error if SharedDataProvider is not present
 */
export function useSharedData<
  TSharedData extends Record<string, unknown> = Record<string, unknown>,
>(): SharedDataValue<TSharedData> {
  const context = useContext(SharedDataContext);
  if (!context) {
    throw new Error("useSharedData can only be used inside SharedDataProvider");
  }
  return context as unknown as SharedDataValue<TSharedData>;
}
