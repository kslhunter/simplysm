import { consola } from "consola";
import { pathx } from "@simplysm/core-node";
import { SdError } from "@simplysm/core-common";
import { loadSdConfig } from "../utils/sd-config";
import { Capacitor } from "../capacitor/capacitor";
import { Electron } from "../electron/electron";

const logger = consola.withTag("sd:cli:device");

export interface DeviceOptions {
  package: string;
  url?: string;
  options: string[];
}

/**
 * Run native app on device/desktop.
 *
 * - Electron config takes priority over Capacitor when both are present.
 * - If --url is not provided, auto-generates from sd.config.ts server port.
 */
export async function runDevice(options: DeviceOptions): Promise<void> {
  const cwd = process.cwd();
  const sdConfig = await loadSdConfig({ cwd, dev: true, options: options.options });

  const pkgConfig = sdConfig.packages[options.package];
  if (pkgConfig == null) {
    throw new SdError(`패키지를 찾을 수 없습니다: ${options.package}`);
  }
  if (pkgConfig.target !== "client") {
    throw new SdError(`client 패키지만 device 실행이 가능합니다: ${options.package} (target: ${pkgConfig.target})`);
  }

  const clientConfig = pkgConfig;
  const pkgDir = pathx.posixResolve(cwd, "packages", options.package);

  // Determine server URL
  let serverUrl = options.url;
  if (serverUrl == null) {
    if (typeof clientConfig.server === "number") {
      serverUrl = `http://localhost:${clientConfig.server}`;
    } else {
      throw new SdError(
        `--url 옵션이 필요합니다. server가 패키지명으로 설정되어 있습니다: ${clientConfig.server}`,
      );
    }
  }

  // Electron takes priority over Capacitor (v13 behavior)
  if (clientConfig.electron != null) {
    logger.start(`${options.package} (electron) 실행 중...`);
    const electron = await Electron.create(pkgDir, clientConfig.electron, clientConfig.exclude);
    await electron.run(serverUrl);
    logger.success(`${options.package} (electron) 실행 완료`);
  } else if (clientConfig.capacitor != null) {
    logger.start(`${options.package} (capacitor) 실행 중...`);
    const cap = await Capacitor.create(pkgDir, clientConfig.capacitor, clientConfig.exclude);
    await cap.run(serverUrl);
    logger.success(`${options.package} (capacitor) 실행 완료`);
  } else {
    throw new SdError(
      `${options.package}에 capacitor 또는 electron 설정이 없습니다.`,
    );
  }
}
