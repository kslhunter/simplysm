import { createContext, useContext } from "solid-js";

/**
 * List context - for passing nested level
 */
export interface ListContextValue {
  level: number;
}

export const ListContext = createContext<ListContextValue>({ level: 0 });

export const useListContext = () => useContext(ListContext);
