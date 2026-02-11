import path from "path";
import { Listr } from "listr2";
import { fsExists } from "@simplysm/core-node";
import { consola } from "consola";
import type { SdConfig, SdClientPackageConfig } from "../sd-config.types";
import { loadSdConfig } from "../utils/sd-config";
import { Capacitor } from "../capacitor/capacitor";
import { Electron } from "../electron/electron";

//#region Types

/**
 * Device 명령 옵션
 */
export interface DeviceOptions {
  /** 패키지 이름 (필수) */
  package: string;
  /** 개발 서버 URL (선택, 미지정 시 sd.config.ts의 server 설정 사용) */
  url?: string;
  /** sd.config.ts에 전달할 추가 옵션 */
  options: string[];
}

//#endregion

//#region Main

/**
 * Android 디바이스에서 앱을 실행한다.
 *
 * - 연결된 Android 디바이스에서 앱 실행
 * - 개발 서버 URL을 WebView에 연결하여 Hot Reload 지원
 *
 * @param options - device 실행 옵션
 * @returns 완료 시 resolve
 */
export async function runDevice(options: DeviceOptions): Promise<void> {
  const { package: packageName, url } = options;
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:device");

  logger.debug("device 시작", { package: packageName, url });

  // sd.config.ts 로드
  let sdConfig: SdConfig;
  try {
    sdConfig = await loadSdConfig({ cwd, dev: true, opt: options.options });
    logger.debug("sd.config.ts 로드 완료");
  } catch (err) {
    consola.error(`sd.config.ts 로드 실패: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
    return;
  }

  // 패키지 설정 확인
  const pkgConfig = sdConfig.packages[packageName];
  if (pkgConfig == null) {
    consola.error(`패키지를 찾을 수 없습니다: ${packageName}`);
    process.exitCode = 1;
    return;
  }

  if (pkgConfig.target !== "client") {
    consola.error(`client 타겟 패키지만 지원합니다: ${packageName} (현재: ${pkgConfig.target})`);
    process.exitCode = 1;
    return;
  }

  const clientConfig: SdClientPackageConfig = pkgConfig;
  const pkgDir = path.join(cwd, "packages", packageName);

  if (clientConfig.electron != null) {
    // Electron 개발 실행
    let serverUrl = url;
    if (serverUrl == null) {
      if (typeof clientConfig.server === "number") {
        serverUrl = `http://localhost:${clientConfig.server}/${packageName}/`;
      } else {
        consola.error(`--url 옵션이 필요합니다. server가 패키지명으로 설정되어 있습니다: ${clientConfig.server}`);
        process.exitCode = 1;
        return;
      }
    }

    logger.debug("개발 서버 URL", { serverUrl });

    const listr = new Listr([
      {
        title: `${packageName} (electron)`,
        task: async () => {
          const electron = await Electron.create(pkgDir, clientConfig.electron!);
          await electron.run(serverUrl);
        },
      },
    ]);

    try {
      await listr.run();
      logger.info("Electron 실행 완료");
    } catch (err) {
      consola.error(`Electron 실행 실패: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
    }
  } else if (clientConfig.capacitor != null) {
    // Capacitor 디바이스 실행 (기존 로직)
    let serverUrl = url;
    if (serverUrl == null) {
      if (typeof clientConfig.server === "number") {
        serverUrl = `http://localhost:${clientConfig.server}/${packageName}/capacitor/`;
      } else {
        consola.error(`--url 옵션이 필요합니다. server가 패키지명으로 설정되어 있습니다: ${clientConfig.server}`);
        process.exitCode = 1;
        return;
      }
    } else if (!serverUrl.endsWith("/")) {
      serverUrl = `${serverUrl}/${packageName}/capacitor/`;
    }

    logger.debug("개발 서버 URL", { serverUrl });

    const capPath = path.join(pkgDir, ".capacitor");
    if (!(await fsExists(capPath))) {
      consola.error(`Capacitor 프로젝트가 초기화되지 않았습니다. 먼저 'pnpm watch ${packageName}'를 실행하세요.`);
      process.exitCode = 1;
      return;
    }

    const listr = new Listr([
      {
        title: `${packageName} (device)`,
        task: async () => {
          const cap = await Capacitor.create(pkgDir, clientConfig.capacitor!);
          await cap.runOnDevice(serverUrl);
        },
      },
    ]);

    try {
      await listr.run();
      logger.info("디바이스 실행 완료");
    } catch (err) {
      consola.error(`디바이스 실행 실패: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
    }
  } else {
    consola.error(`electron 또는 capacitor 설정이 없습니다: ${packageName}`);
    process.exitCode = 1;
  }
}

//#endregion
