import { LazyGcMap } from "@simplysm/sd-core-common";
import { FsUtils, SdFsWatcher, SdLogger } from "@simplysm/sd-core-node";
import path from "path";

export class SdConfigManager {
  private static readonly _logger = SdLogger.get([
    "simplysm",
    "sd-service-server",
    "SdConfigManager",
  ]);

  // 값: Config 객체, 키: 파일 경로
  private static readonly _cache = new LazyGcMap<string, any>({
    gcInterval: 10 * 60 * 1000, // 10분마다
    expireTime: 60 * 60 * 1000, // 1시간 만료
    onExpire: async (filePath, _config) => {
      // 만료 시 실행될 로직: Watcher 닫기
      SdConfigManager._logger.debug(`설정 캐시 만료 및 감시 해제: ${path.basename(filePath)}`);
      await SdConfigManager._closeWatcher(filePath);
    },
  });

  private static readonly _watchers = new Map<string, SdFsWatcher>();

  static async getConfigAsync<T>(filePath: string): Promise<T | undefined> {
    // 1. 캐시 적중 (시간 자동 갱신)
    if (this._cache.has(filePath)) {
      return this._cache.get(filePath);
    }

    if (!FsUtils.exists(filePath)) return undefined;

    try {
      // 2. 로드 및 캐시
      const config = await FsUtils.readJsonAsync(filePath);
      this._cache.set(filePath, config);

      // 3. Watcher 등록
      if (!this._watchers.has(filePath)) {
        try {
          const watcher = await SdFsWatcher.watchAsync([filePath]);
          this._watchers.set(filePath, watcher);

          watcher.onChange({ delay: 100 }, async () => {
            if (!FsUtils.exists(filePath)) {
              this._cache.delete(filePath);
              await this._closeWatcher(filePath);
              this._logger.debug(`설정 파일 삭제됨: ${path.basename(filePath)}`);
              return;
            }

            try {
              const newConfig = await FsUtils.readJsonAsync(filePath);
              this._cache.set(filePath, newConfig); // 값 갱신 + 시간 갱신
              this._logger.debug(`설정 파일 실시간 갱신: ${path.basename(filePath)}`);
            } catch (err) {
              this._logger.warn(`설정 파일 갱신 실패: ${filePath}`, err);
            }
          });
        } catch (err) {
          this._logger.error(`감시 실패: ${filePath}`, err);
        }
      }

      return config;
    } catch (err) {
      throw err;
    }
  }

  private static async _closeWatcher(filePath: string) {
    const watcher = this._watchers.get(filePath);
    if (watcher) {
      await watcher.close();
      this._watchers.delete(filePath);
    }
  }
}
