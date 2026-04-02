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
 * 네이티브 앱을 디바이스/데스크톱에서 실행한다.
 *
 * - Electron 설정이 Capacitor보다 우선한다.
 * - --url이 제공되지 않으면 sd.config.ts의 서버 포트로 자동 생성한다.
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

  // 서버 URL 결정
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

  // Electron이 Capacitor보다 우선
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
