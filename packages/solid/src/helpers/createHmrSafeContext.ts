import { type Context, createContext } from "solid-js";

const CACHE_KEY = "__simplysm_ctx__";
const cache = ((globalThis as unknown as Record<string, Record<string, unknown>>)[CACHE_KEY] ??= {});

export function createHmrSafeContext<TValue>(key: string): Context<TValue | undefined> {
  return (cache[key] ??= createContext<TValue>()) as Context<TValue | undefined>;
}
