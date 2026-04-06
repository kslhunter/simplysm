import fs from "node:fs";
import http from "node:http";
import path from "path";
import { consola } from "consola";
import { pathx } from "@simplysm/core-node";
import { SdError } from "@simplysm/core-common";
import { loadSdConfig } from "../utils/sd-config";
import { Capacitor } from "../capacitor/capacitor";
import { Electron } from "../electron/electron";

const logger = consola.withTag("sd:cli:device");

export interface DeviceOptions {
  target?: string;
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
  const sdConfig = await loadSdConfig({ cwd, dev: true, opt: options.options });

  // target 결정: 미지정 시 유일한 client 패키지 자동 선택
  let targetName: string;
  if (options.target != null) {
    targetName = options.target;
  } else {
    const clientNames = Object.entries(sdConfig.packages)
      .filter(([, cfg]) => cfg != null && cfg.target === "client")
      .map(([name]) => name);
    if (clientNames.length === 0) {
      throw new SdError("device 실행 가능한 client 패키지가 없습니다.");
    }
    if (clientNames.length > 1) {
      throw new SdError(
        `client 패키지가 여러 개입니다. target을 지정해주세요: ${clientNames.join(", ")}`,
      );
    }
    targetName = clientNames[0];
  }

  const pkgConfig = sdConfig.packages[targetName];
  if (pkgConfig == null) {
    throw new SdError(`패키지를 찾을 수 없습니다: ${targetName}`);
  }
  if (pkgConfig.target !== "client") {
    throw new SdError(
      `client 패키지만 device 실행이 가능합니다: ${targetName} (target: ${pkgConfig.target})`,
    );
  }

  const clientConfig = pkgConfig;
  const pkgDir = pathx.posixResolve(cwd, "packages", targetName);

  // 서버 URL 결정
  let serverUrl = options.url;
  if (serverUrl == null) {
    if (typeof clientConfig.server === "number") {
      serverUrl = `http://localhost:${clientConfig.server}/${targetName}/`;
    } else {
      // server가 패키지명(string)인 경우: 서버 패키지의 .dev-port 파일에서 포트 자동 탐지
      const serverPkgDir = pathx.posixResolve(cwd, "packages", clientConfig.server);
      const portFile = path.join(serverPkgDir, "dist", ".dev-port");
      let portStr: string;
      try {
        portStr = fs.readFileSync(portFile, "utf-8").trim();
      } catch {
        throw new SdError(
          "dev 서버가 실행 중이 아닙니다. 먼저 pnpm dev를 실행해주세요.",
        );
      }
      const port = Number(portStr);
      serverUrl = `http://localhost:${port}/${targetName}/`;

      // HTTP 헬스체크
      const alive = await checkDevServer(serverUrl);
      if (!alive) {
        throw new SdError(
          "dev 서버가 응답하지 않습니다. pnpm dev를 다시 실행해주세요.",
        );
      }
    }
  }

  // Electron이 Capacitor보다 우선
  if (clientConfig.electron != null) {
    logger.start(`${targetName} (electron) 실행 중...`);
    const electron = await Electron.create(pkgDir, clientConfig.electron, clientConfig.exclude);
    await electron.run(serverUrl);
    logger.success(`${targetName} (electron) 실행 완료`);
  } else if (clientConfig.capacitor != null) {
    logger.start(`${targetName} (capacitor) 실행 중...`);
    const cap = await Capacitor.create(pkgDir, clientConfig.capacitor, clientConfig.exclude);
    await cap.run(serverUrl);
    logger.success(`${targetName} (capacitor) 실행 완료`);
  } else {
    throw new SdError(`${targetName}에 capacitor 또는 electron 설정이 없습니다.`);
  }
}

/** dev 서버가 응답하는지 HTTP GET으로 확인한다. */
function checkDevServer(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}
