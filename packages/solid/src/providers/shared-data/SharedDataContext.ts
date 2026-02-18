import { type Accessor, createContext, useContext } from "solid-js";

export interface SharedDataDefinition<TData> {
  serviceKey: string;
  fetch: (changeKeys?: Array<string | number>) => Promise<TData[]>;
  getKey: (item: TData) => string | number;
  orderBy: [(item: TData) => unknown, "asc" | "desc"][];
  filter?: unknown;
}

export interface SharedDataAccessor<TData> {
  items: Accessor<TData[]>;
  get: (key: string | number | undefined) => TData | undefined;
  emit: (changeKeys?: Array<string | number>) => Promise<void>;
}

export type SharedDataValue<TSharedData extends Record<string, unknown>> = {
  [K in keyof TSharedData]: SharedDataAccessor<TSharedData[K]>;
} & {
  wait: () => Promise<void>;
  busy: Accessor<boolean>;
};

export const SharedDataContext = createContext<SharedDataValue<Record<string, unknown>>>();

export function useSharedData<
  TSharedData extends Record<string, unknown> = Record<string, unknown>,
>(): SharedDataValue<TSharedData> {
  const context = useContext(SharedDataContext);
  if (!context) {
    throw new Error(
      "useSharedData는 SharedDataProvider 내부에서만 사용할 수 있습니다. SharedDataProvider는 ServiceClientProvider 아래에 위치해야 합니다",
    );
  }
  return context as unknown as SharedDataValue<TSharedData>;
}
