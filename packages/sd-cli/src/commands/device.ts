import path from "path";
import { fsExists } from "@simplysm/core-node";
import { consola } from "consola";
import type { SdConfig, SdClientPackageConfig } from "../sd-config.types";
import { loadSdConfig } from "../utils/sd-config";
import { Capacitor } from "../capacitor/capacitor";
import { Electron } from "../electron/electron";

//#region Types

/**
 * Device command options
 */
export interface DeviceOptions {
  /** Package name (required) */
  package: string;
  /** Development server URL (optional, uses server config from sd.config.ts if not specified) */
  url?: string;
  /** Additional options to pass to sd.config.ts */
  options: string[];
}

//#endregion

//#region Main

/**
 * Runs an app on an Android device.
 *
 * - Runs app on connected Android device
 * - Connects development server URL to WebView to support Hot Reload
 *
 * @param options - device execution options
 * @returns resolves when complete
 */
export async function runDevice(options: DeviceOptions): Promise<void> {
  const { package: packageName, url } = options;
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:device");

  logger.debug("device start", { package: packageName, url });

  // Load sd.config.ts
  let sdConfig: SdConfig;
  try {
    sdConfig = await loadSdConfig({ cwd, dev: true, opt: options.options });
    logger.debug("sd.config.ts loaded");
  } catch (err) {
    logger.error(`Failed to load sd.config.ts: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
    return;
  }

  // Verify package config
  const pkgConfig = sdConfig.packages[packageName];
  if (pkgConfig == null) {
    logger.error(`Package not found: ${packageName}`);
    process.exitCode = 1;
    return;
  }

  if (pkgConfig.target !== "client") {
    logger.error(`Only client target packages are supported: ${packageName} (current: ${pkgConfig.target})`);
    process.exitCode = 1;
    return;
  }

  const clientConfig: SdClientPackageConfig = pkgConfig;
  const pkgDir = path.join(cwd, "packages", packageName);

  if (clientConfig.electron != null) {
    // Run Electron development
    let serverUrl = url;
    if (serverUrl == null) {
      if (typeof clientConfig.server === "number") {
        serverUrl = `http://localhost:${clientConfig.server}/${packageName}/`;
      } else {
        logger.error(
          `--url option is required. server is set to package name: ${clientConfig.server}`,
        );
        process.exitCode = 1;
        return;
      }
    }

    logger.debug("development server URL", { serverUrl });

    logger.start(`Running ${packageName} (electron)...`);
    try {
      const electron = await Electron.create(pkgDir, clientConfig.electron);
      await electron.run(serverUrl);
      logger.success("Electron execution completed");
    } catch (err) {
      logger.error(`Failed to run Electron: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
    }
  } else if (clientConfig.capacitor != null) {
    // Run Capacitor device (existing logic)
    let serverUrl = url;
    if (serverUrl == null) {
      if (typeof clientConfig.server === "number") {
        serverUrl = `http://localhost:${clientConfig.server}/${packageName}/capacitor/`;
      } else {
        logger.error(
          `--url option is required. server is set to package name: ${clientConfig.server}`,
        );
        process.exitCode = 1;
        return;
      }
    } else if (!serverUrl.endsWith("/")) {
      serverUrl = `${serverUrl}/${packageName}/capacitor/`;
    }

    logger.debug("development server URL", { serverUrl });

    const capPath = path.join(pkgDir, ".capacitor");
    if (!(await fsExists(capPath))) {
      logger.error(
        `Capacitor project is not initialized. First run 'pnpm watch ${packageName}'.`,
      );
      process.exitCode = 1;
      return;
    }

    logger.start(`Running ${packageName} (device)...`);
    try {
      const cap = await Capacitor.create(pkgDir, clientConfig.capacitor);
      await cap.runOnDevice(serverUrl);
      logger.success("Device execution completed");
    } catch (err) {
      logger.error(`Failed to run device: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
    }
  } else {
    logger.error(`No electron or capacitor config found: ${packageName}`);
    process.exitCode = 1;
  }
}

//#endregion
