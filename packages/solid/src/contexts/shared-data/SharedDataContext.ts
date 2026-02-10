import { type Accessor, createContext, useContext } from "solid-js";

export interface SharedDataDefinition<T> {
  serviceKey: string;
  fetch: (changeKeys?: Array<string | number>) => Promise<T[]>;
  getKey: (item: T) => string | number;
  orderBy: [(item: T) => unknown, "asc" | "desc"][];
  filter?: unknown;
}

export interface SharedDataAccessor<T> {
  items: Accessor<T[]>;
  get: (key: string | number | undefined) => T | undefined;
  emit: (changeKeys?: Array<string | number>) => Promise<void>;
}

export type SharedDataValue<T extends Record<string, unknown>> = {
  [K in keyof T]: SharedDataAccessor<T[K]>;
} & {
  wait: () => Promise<void>;
  loading: Accessor<boolean>;
};

export const SharedDataContext = createContext<SharedDataValue<Record<string, unknown>>>();

export function useSharedData<T extends Record<string, unknown> = Record<string, unknown>>(): SharedDataValue<T> {
  const context = useContext(SharedDataContext);
  if (!context) {
    throw new Error(
      "useSharedData는 SharedDataProvider 내부에서만 사용할 수 있습니다. SharedDataProvider는 ServiceClientProvider 아래에 위치해야 합니다",
    );
  }
  return context as unknown as SharedDataValue<T>;
}
