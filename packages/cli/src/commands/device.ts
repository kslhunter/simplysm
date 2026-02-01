import path from "path";
import { Listr } from "listr2";
import { fsExistsAsync } from "@simplysm/core-node";
import { consola } from "consola";
import type { SdConfig, SdClientPackageConfig } from "../sd-config.types";
import { loadSdConfig } from "../utils/sd-config";
import { Capacitor } from "../capacitor/capacitor";

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
    logger.error("sd.config.ts 로드 실패", err);
    process.stderr.write(`✖ sd.config.ts 로드 실패: ${err instanceof Error ? err.message : err}\n`);
    process.exitCode = 1;
    return;
  }

  // 패키지 설정 확인
  const pkgConfig = sdConfig.packages[packageName];
  if (pkgConfig == null) {
    logger.error(`패키지를 찾을 수 없습니다: ${packageName}`);
    process.stderr.write(`✖ 패키지를 찾을 수 없습니다: ${packageName}\n`);
    process.exitCode = 1;
    return;
  }

  if (pkgConfig.target !== "client") {
    logger.error(`client 타겟 패키지만 지원합니다: ${packageName} (현재: ${pkgConfig.target})`);
    process.stderr.write(`✖ client 타겟 패키지만 지원합니다: ${packageName} (현재: ${pkgConfig.target})\n`);
    process.exitCode = 1;
    return;
  }

  // pkgConfig.target === "client" 이므로 타입 좁힘
  const clientConfig: SdClientPackageConfig = pkgConfig;
  if (clientConfig.capacitor == null) {
    logger.error(`capacitor 설정이 없습니다: ${packageName}`);
    process.stderr.write(`✖ capacitor 설정이 없습니다: ${packageName}\n`);
    process.exitCode = 1;
    return;
  }

  // 개발 서버 URL 결정
  let serverUrl = url;
  if (serverUrl == null) {
    serverUrl = `http://localhost:${clientConfig.server}/${packageName}/capacitor/`;
  } else if (!serverUrl.endsWith("/")) {
    serverUrl = `${serverUrl}/${packageName}/capacitor/`;
  }

  logger.debug("개발 서버 URL", { serverUrl });

  // Capacitor 프로젝트 확인
  const pkgDir = path.join(cwd, "packages", packageName);
  const capPath = path.join(pkgDir, ".capacitor");

  if (!(await fsExistsAsync(capPath))) {
    logger.error(`Capacitor 프로젝트가 초기화되지 않았습니다. 먼저 'pnpm watch ${packageName}'를 실행하세요.`);
    process.stderr.write(`✖ Capacitor 프로젝트가 초기화되지 않았습니다. 먼저 'pnpm watch ${packageName}'를 실행하세요.\n`);
    process.exitCode = 1;
    return;
  }

  // Listr로 디바이스 실행
  const listr = new Listr([
    {
      title: `${packageName} (device)`,
      task: async () => {
        const cap = await Capacitor.create(pkgDir, clientConfig.capacitor!);
        await cap.runOnDeviceAsync(serverUrl);
      },
    },
  ]);

  try {
    await listr.run();
    logger.info("디바이스 실행 완료");
  } catch (err) {
    logger.error("디바이스 실행 실패", err);
    process.stderr.write(`✖ 디바이스 실행 실패: ${err instanceof Error ? err.message : err}\n`);
    process.exitCode = 1;
  }
}

//#endregion
