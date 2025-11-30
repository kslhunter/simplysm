import { SdServiceServer } from "./SdServiceServer";
import { ISdServiceRequest } from "@simplysm/sd-service-common";
import * as http from "http";
import { SdServiceSocket } from "./internal/SdServiceSocket";
import path from "path";
import { FsUtils, SdFsWatcher, SdLogger } from "@simplysm/sd-core-node"; // [가정] SdFsWatcher 위치
import { ObjectUtils, Type } from "@simplysm/sd-core-common";

export interface ISdServiceServerOptions {
  // ... (기존 옵션 유지)
  rootPath: string;
  port: number;
  ssl?: {
    pfxBuffer: Buffer | (() => Promise<Buffer> | Buffer);
    passphrase: string;
  };
  pathProxy?: Record<string, string>;
  portProxy?: Record<string, number>;
  services: Type<SdServiceBase>[];
  middlewares?: ((
    req: http.IncomingMessage,
    res: http.ServerResponse,
    next: (err?: any) => void,
  ) => void)[];
}

export class SdServiceBase {
  server!: SdServiceServer;
  socketClient?: SdServiceSocket;
  request?: ISdServiceRequest;

  // [설정 캐시 시스템]
  static #configCache = new Map<string, any>();

  // [Watcher 관리]
  // 중복 감시 방지를 위한 플래그 (async 초기화 중복 방지용)
  static #watchingPaths = new Set<string>();
  // 실제 Watcher 인스턴스 보관 (종료 시 close 호출 등을 위해)
  static #watchers = new Map<string, SdFsWatcher>();

  static #logger = SdLogger.get(["simplysm", "sd-service-server", "SdServiceBase"]);

  async getConfig<T>(section: string): Promise<T> {
    let configParent: Record<string, T | undefined> = {};

    // 1. Root Config
    const rootFilePath = path.resolve(this.server.options.rootPath, ".config.json");
    const rootConfig = await this.#getOrLoadConfigAsync<Record<string, T>>(rootFilePath);
    if (rootConfig) {
      configParent = rootConfig;
    }

    // 2. Client Config
    const clientName = this.request?.clientName;
    if (clientName != null) {
      const targetPath = this.getClientPath();
      const clientFilePath = path.resolve(targetPath, ".config.json");

      const clientConfig = await this.#getOrLoadConfigAsync<Record<string, T>>(clientFilePath);
      if (clientConfig) {
        configParent = ObjectUtils.merge(configParent, clientConfig);
      }
    }

    const config = configParent[section];
    if (config == null) throw new Error(`설정 섹션을 찾을 수 없습니다: ${section}`);
    return config;
  }

  getClientPath(): string {
    const clientName = this.request?.clientName;
    if (clientName == null) throw new Error("api로 사용할 수 없는 서비스입니다.");

    // [보안] Path Traversal 방지
    if (clientName.includes("..") || clientName.includes("/") || clientName.includes("\\")) {
      throw new Error(`유효하지 않은 클라이언트 명입니다: ${clientName}`);
    }

    return (
      this.server.options.pathProxy?.[clientName] ??
      path.resolve(this.server.options.rootPath, "www", clientName)
    );
  }

  // [핵심] SdFsWatcher를 이용한 설정 로드 및 감시
  async #getOrLoadConfigAsync<T>(filePath: string): Promise<T | undefined> {
    // 1. 캐시 적중 시 즉시 반환 (가장 빠름)
    if (SdServiceBase.#configCache.has(filePath)) {
      return SdServiceBase.#configCache.get(filePath);
    }

    // 2. 파일 없으면 패스
    if (!FsUtils.exists(filePath)) {
      return undefined;
    }

    try {
      // 3. 파일 로드 및 캐시 저장
      const config = await FsUtils.readJsonAsync(filePath);
      SdServiceBase.#configCache.set(filePath, config);

      // 4. 감시자 등록 (아직 감시 중이 아닐 경우에만)
      if (!SdServiceBase.#watchingPaths.has(filePath)) {
        // 중복 실행 방지 플래그 설정
        SdServiceBase.#watchingPaths.add(filePath);

        // 비동기로 Watcher 생성 (응답 속도를 위해 await 하지 않음, 필요시 await 가능)
        SdFsWatcher.watchAsync([filePath])
          .then((watcher) => {
            SdServiceBase.#watchers.set(filePath, watcher);

            watcher.onChange({ delay: 100 }, async (changes) => {
              // 삭제(unlink) 감지 시: 캐시 및 왓처 제거
              if (!FsUtils.exists(filePath)) {
                SdServiceBase.#configCache.delete(filePath);
                SdServiceBase.#watchingPaths.delete(filePath);

                await watcher.close();
                SdServiceBase.#watchers.delete(filePath);

                SdServiceBase.#logger.debug(`설정 파일 삭제됨: ${path.basename(filePath)}`);
                return;
              }

              // 변경(change/add) 감지 시: 리로드
              try {
                const newConfig = await FsUtils.readJsonAsync(filePath);
                SdServiceBase.#configCache.set(filePath, newConfig);
                SdServiceBase.#logger.debug(`설정 파일 실시간 갱신: ${path.basename(filePath)}`);
              } catch (err) {
                SdServiceBase.#logger.warn(
                  `설정 파일 갱신 실패 (기존 설정 유지): ${filePath}`,
                  err,
                );
              }
            });
          })
          .catch((err) => {
            SdServiceBase.#logger.error(`설정 파일 감시 시작 실패: ${filePath}`, err);
            // 실패 시 플래그 해제하여 다음 요청 때 재시도 가능하게 함
            SdServiceBase.#watchingPaths.delete(filePath);
          });
      }

      return config;
    } catch (err) {
      throw err;
    }
  }
}
