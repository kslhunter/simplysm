import type { Plugin, ViteDevServer } from "vite";
import path from "path";
import fs from "fs";
import { FsWatcher } from "@simplysm/core-node";

/** replaceDeps 항목의 최소 정보 */
export interface ScopeWatchReplaceDep {
  /** 패키지명 (예: "@scope/core") */
  packageName: string;
  /** 소스 경로 (패키지 루트 디렉토리) */
  sourcePath: string;
}

/** sdScopeWatchPlugin 옵션 */
export interface SdScopeWatchPluginOptions {
  /** 패키지 디렉토리 경로 */
  pkgDir: string;
  /** replaceDeps 목록 */
  replaceDeps: ScopeWatchReplaceDep[];
  /** replaceDeps 변경 감지 콜백 */
  onScopeRebuild?: () => void;
}

/**
 * replaceDeps 패키지의 루트 디렉토리를 감시하여 Vite HMR을 트리거하는 플러그인.
 * - config 훅: replaceDeps를 optimizeDeps.exclude에 추가
 * - configureServer 훅: FsWatcher로 패키지 루트 감시, 변경 시 Vite watcher에 change 이벤트 재발행
 */
export function sdScopeWatchPlugin(options: SdScopeWatchPluginOptions): Plugin {
  return {
    name: "sd-scope-watch",

    config() {
      return {
        optimizeDeps: {
          force: true,
          exclude: options.replaceDeps.map((dep) => dep.packageName),
        },
      };
    },

    async configureServer(server: ViteDevServer) {
      if (options.replaceDeps.length === 0) return;

      const watchPaths: string[] = [];
      for (const dep of options.replaceDeps) {
        const pkgRoot = path.join(
          options.pkgDir,
          "node_modules",
          ...dep.packageName.split("/"),
        );
        if (fs.existsSync(pkgRoot)) {
          // symlink → realpath 해결 (Vite 모듈 그래프가 realpath를 키로 사용)
          try {
            watchPaths.push(fs.realpathSync(pkgRoot));
          } catch {
            watchPaths.push(pkgRoot);
          }
        }
      }

      if (watchPaths.length === 0) return;

      const scopeWatcher = await FsWatcher.watch(watchPaths, {
        ignored: ["**/node_modules", "**/.cache", "**/tests"],
      });
      scopeWatcher.onChange({ delay: 300 }, (changeInfos: Array<{ path: string }>) => {
        for (const info of changeInfos) {
          server.watcher.emit("change", info.path);
        }
        options.onScopeRebuild?.();
      });

      server.httpServer?.on("close", () => void scopeWatcher.close());
    },
  };
}
