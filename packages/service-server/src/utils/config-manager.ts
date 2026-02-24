import { LazyGcMap } from "@simplysm/core-common";
import { fsExists, fsReadJson, FsWatcher } from "@simplysm/core-node";
import path from "path";
import consola from "consola";

const logger = consola.withTag("service-server:ConfigManager");

// Value: Config object, Key: file path
const _cache = new LazyGcMap<string, unknown>({
  gcInterval: 10 * 60 * 1000, // Every 10 minutes
  expireTime: 60 * 60 * 1000, // Expire after 1 hour
  onExpire: async (filePath) => {
    logger.debug(`Config cache expired and watcher released: ${path.basename(filePath)}`);
    await closeWatcher(filePath);
  },
});

const _watchers = new Map<string, FsWatcher>();

export async function getConfig<TConfig>(filePath: string): Promise<TConfig | undefined> {
  // 1. Cache hit (time auto-renewed)
  if (_cache.has(filePath)) {
    return _cache.get(filePath) as TConfig;
  }

  if (!(await fsExists(filePath))) return undefined;

  // 2. Load and cache
  const config = await fsReadJson(filePath);
  _cache.set(filePath, config);

  // 3. Register watcher
  if (!_watchers.has(filePath)) {
    try {
      const watcher = await FsWatcher.watch([filePath]);
      _watchers.set(filePath, watcher);

      watcher.onChange({ delay: 100 }, async () => {
        if (!(await fsExists(filePath))) {
          _cache.delete(filePath);
          await closeWatcher(filePath);
          logger.debug(`Config file deleted: ${path.basename(filePath)}`);
          return;
        }

        try {
          const newConfig = await fsReadJson(filePath);
          _cache.set(filePath, newConfig);
          logger.debug(`Config file live-reloaded: ${path.basename(filePath)}`);
        } catch (err) {
          logger.warn(`Config file reload failed: ${filePath}`, err);
        }
      });
    } catch (err) {
      logger.error(`Watch failed: ${filePath}`, err);
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
