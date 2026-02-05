import { createContext, useContext } from "solid-js";

/**
 * List context - 중첩 level 전달용
 */
export interface ListContextValue {
  level: number;
}

export const ListContext = createContext<ListContextValue>({ level: 0 });

export const useListContext = () => useContext(ListContext);
