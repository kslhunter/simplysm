import { vi } from "vitest";
import path from "path";
import type { SdConfig, SdClientPackageConfig } from "../../src/sd-config.types";

export const FIXTURE_DIR = path.resolve(import.meta.dirname, "fixtures");
export const PKG_DIR = path.resolve(FIXTURE_DIR, "packages/basic-app");

export function createTestSdConfig(
  overrides?: Partial<SdClientPackageConfig>,
): SdConfig {
  return {
    packages: {
      "basic-app": { target: "client", server: 3000, ...overrides },
    },
  };
}

/** Vite lifecycle 시뮬레이션: config → configResolved → [configureServer] → buildStart */
export async function initPlugin(
  plugin: any,
  options?: { mode?: string; command?: string; sourcemap?: boolean; withServer?: boolean },
): Promise<void> {
  const mode = options?.mode ?? "development";
  const command = options?.command ?? "serve";
  const sourcemap = options?.sourcemap ?? false;
  await plugin.config?.({}, { mode, command });
  plugin.configResolved?.({ build: { sourcemap } });
  if (options?.withServer === true) {
    plugin.configureServer?.({
      middlewares: { use: vi.fn() },
      httpServer: { on: vi.fn() },
      config: { base: "/" },
      hot: { send: vi.fn() },
    });
  }
  await plugin.buildStart?.call({});
}
