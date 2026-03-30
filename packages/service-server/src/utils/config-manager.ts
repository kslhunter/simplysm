import { LazyGcMap } from "@simplysm/core-common";
import { fsx, FsWatcher } from "@simplysm/core-node";
import path from "path";
import consola from "consola";

const logger = consola.withTag("service-server:ConfigManager");

// 값: 설정 객체, 키: 파일 경로
const _cache = new LazyGcMap<string, unknown>({
  gcInterval: 10 * 60 * 1000, // 10분마다
  expireTime: 60 * 60 * 1000, // 1시간 후 만료
  onExpire: async (filePath) => {
    logger.debug(`설정 캐시 만료 및 워처 해제됨: ${path.basename(filePath)}`);
    await closeWatcher(filePath);
  },
});

const _watchers = new Map<string, FsWatcher>();

export async function getConfig<TConfig>(filePath: string): Promise<TConfig | undefined> {
  // 1. 캐시 히트 (시간 자동 갱신)
  if (_cache.has(filePath)) {
    return _cache.get(filePath) as TConfig;
  }

  if (!(await fsx.exists(filePath))) return undefined;

  // 2. 로드 및 캐시
  const config = await fsx.readJson(filePath);
  _cache.set(filePath, config);

  // 3. 워처 등록
  if (!_watchers.has(filePath)) {
    try {
      const watcher = await FsWatcher.watch([filePath]);
      _watchers.set(filePath, watcher);

      watcher.onChange({ delay: 100 }, async () => {
        if (!(await fsx.exists(filePath))) {
          _cache.delete(filePath);
          await closeWatcher(filePath);
          logger.debug(`설정 파일 삭제됨: ${path.basename(filePath)}`);
          return;
        }

        try {
          const newConfig = await fsx.readJson(filePath);
          _cache.set(filePath, newConfig);
          logger.debug(`설정 파일 실시간 리로드됨: ${path.basename(filePath)}`);
        } catch (err) {
          logger.warn(`설정 파일 리로드 실패: ${filePath}`, err);
        }
      });
    } catch (err) {
      logger.error(`워치 실패: ${filePath}`, err);
    }
  }

  return config as TConfig;
}

async function closeWatcher(filePath: string) {
  const watcher = _watchers.get(filePath);
  if (watcher != null) {
    await watcher.close();
    _watchers.delete(filePath);
  }
}
