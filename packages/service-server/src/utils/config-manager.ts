import { LazyGcMap } from "@simplysm/core-common";
import { fsExists, fsReadJson, FsWatcher } from "@simplysm/core-node";
import path from "path";
import consola from "consola";

const logger = consola.withTag("service-server:ConfigManager");

// 값: Config 객체, 키: 파일 경로
const _cache = new LazyGcMap<string, unknown>({
  gcInterval: 10 * 60 * 1000, // 10분마다
  expireTime: 60 * 60 * 1000, // 1시간 만료
  onExpire: async (filePath) => {
    logger.debug(`설정 캐시 만료 및 감시 해제: ${path.basename(filePath)}`);
    await closeWatcher(filePath);
  },
});

const _watchers = new Map<string, FsWatcher>();

export async function getConfig<T>(filePath: string): Promise<T | undefined> {
  // 1. 캐시 적중 (시간 자동 갱신)
  if (_cache.has(filePath)) {
    return _cache.get(filePath) as T;
  }

  if (!(await fsExists(filePath))) return undefined;

  // 2. 로드 및 캐시
  const config = await fsReadJson(filePath);
  _cache.set(filePath, config);

  // 3. Watcher 등록
  if (!_watchers.has(filePath)) {
    try {
      const watcher = await FsWatcher.watch([filePath]);
      _watchers.set(filePath, watcher);

      watcher.onChange({ delay: 100 }, async () => {
        if (!(await fsExists(filePath))) {
          _cache.delete(filePath);
          await closeWatcher(filePath);
          logger.debug(`설정 파일 삭제됨: ${path.basename(filePath)}`);
          return;
        }

        try {
          const newConfig = await fsReadJson(filePath);
          _cache.set(filePath, newConfig);
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

async function closeWatcher(filePath: string) {
  const watcher = _watchers.get(filePath);
  if (watcher != null) {
    await watcher.close();
    _watchers.delete(filePath);
  }
}
