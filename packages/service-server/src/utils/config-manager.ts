import { LazyGcMap } from "@simplysm/core-common";
import { fsExists, fsReadJson, FsWatcher } from "@simplysm/core-node";
import path from "path";
import consola from "consola";

const logger = consola.withTag("service-server:ConfigManager");

export class ConfigManager {
  // 값: Config 객체, 키: 파일 경로
  private static readonly _cache = new LazyGcMap<string, unknown>({
    gcInterval: 10 * 60 * 1000, // 10분마다
    expireTime: 60 * 60 * 1000, // 1시간 만료
    onExpire: async (filePath) => {
      logger.debug(`설정 캐시 만료 및 감시 해제: ${path.basename(filePath)}`);
      await ConfigManager._closeWatcher(filePath);
    },
  });

  private static readonly _watchers = new Map<string, FsWatcher>();

  static async getConfig<T>(filePath: string): Promise<T | undefined> {
    // 1. 캐시 적중 (시간 자동 갱신)
    if (this._cache.has(filePath)) {
      return this._cache.get(filePath) as T;
    }

    if (!(await fsExists(filePath))) return undefined;

    // 2. 로드 및 캐시
    const config = await fsReadJson(filePath);
    this._cache.set(filePath, config);

    // 3. Watcher 등록
    if (!this._watchers.has(filePath)) {
      try {
        const watcher = await FsWatcher.watch([filePath]);
        this._watchers.set(filePath, watcher);

        watcher.onChange({ delay: 100 }, async () => {
          if (!(await fsExists(filePath))) {
            this._cache.delete(filePath);
            await this._closeWatcher(filePath);
            logger.debug(`설정 파일 삭제됨: ${path.basename(filePath)}`);
            return;
          }

          try {
            const newConfig = await fsReadJson(filePath);
            this._cache.set(filePath, newConfig);
            logger.debug(`설정 파일 실시간 갱신: ${path.basename(filePath)}`);
          } catch (err) {
            logger.warn(`설정 파일 갱신 실패: ${filePath}`, err);
          }
        });
      } catch (err) {
        logger.error(`감시 실패: ${filePath}`, err);
      }
    }

    return config as T;
  }

  private static async _closeWatcher(filePath: string) {
    const watcher = this._watchers.get(filePath);
    if (watcher != null) {
      await watcher.close();
      this._watchers.delete(filePath);
    }
  }
}
