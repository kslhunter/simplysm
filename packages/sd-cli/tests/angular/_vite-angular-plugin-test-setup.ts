import path from "path";

export const FIXTURE_DIR = path.resolve(import.meta.dirname, "fixtures");
export const PKG_DIR = path.resolve(FIXTURE_DIR, "packages/basic-app");

/** Vite lifecycle 시뮬레이션: config → buildStart */
export async function initPlugin(plugin: any): Promise<void> {
  await plugin.config?.({}, { mode: "development", command: "serve" });
  await plugin.buildStart?.call({});
}
