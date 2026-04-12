import fs from "fs";
import type { ConsolaInstance } from "consola";
import { FsWatcher, pathx } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";
import type { ServerWatchInfo } from "./server-build.worker";
import {
  parseTsconfig,
  getPackageSourceFiles,
} from "../utils/tsconfig";
import { collectAllExternals } from "../deps/server-externals/server-production-files";
import { hasFileAddOrRemove } from "./build-change-filter";
import * as esbuildCtx from "./server-esbuild-context";

/**
 * server-build watch 루프 설정
 */
export interface ServerWatchLoopConfig {
  info: ServerWatchInfo;
  watchPaths: string[];
  logger: ConsolaInstance;
  /** watch 시작 시 수집된 초기 외부 모듈 */
  initialExternals: string[];
  /** 빌드 시작 이벤트 콜백 */
  onBuildStart: () => void;
  /** 빌드 완료 이벤트 콜백 */
  onBuild: (result: { build: { success: boolean; errors?: string[]; warnings?: string[] }; mainJsPath: string }) => void;
  /** 에러 이벤트 콜백 */
  onError: (message: string) => void;
  /** 리빌드 실행 콜백 */
  rebuild: () => Promise<{ build: { success: boolean; errors?: string[]; warnings?: string[] }; mainJsPath: string }>;
}

/**
 * server-build 전용 FsWatcher 감시 루프를 시작한다.
 *
 * onChange 핸들러:
 * - 파일 추가/삭제: tsconfig 재파싱, esbuild context 재생성, 리빌드
 * - 파일 변경: metafile 기반 필터링 → 관련 파일이면 리빌드, 아니면 건너뜀
 */
export async function startServerWatchLoop(config: ServerWatchLoopConfig): Promise<FsWatcher> {
  const { info, watchPaths, logger } = config;
  let cachedExternal = [...config.initialExternals];

  const watcher = await FsWatcher.watch(watchPaths);

  watcher.onChange({ delay: 300 }, async (changes) => {
    try {
      const addOrRemove = hasFileAddOrRemove(changes);

      if (addOrRemove) {
        config.onBuildStart();

        // 파일 추가/삭제 시 컨텍스트 재생성
        const newParsedConfig = parseTsconfig(info.pkgDir);
        const newEntryPoints = getPackageSourceFiles(info.pkgDir, newParsedConfig);

        // package.json이 변경된 경우에만 외부 모듈 재수집
        const hasPackageJsonChange = changes.some((c) =>
          c.path.endsWith("package.json"),
        );
        if (hasPackageJsonChange) {
          cachedExternal = collectAllExternals(info.pkgDir, info.externals);
        }

        if (info.output.js) {
          await esbuildCtx.recreateContext({
            pkgDir: info.pkgDir,
            entryPoints: newEntryPoints,
            env: info.env,
            external: cachedExternal,
          });
        }

        const result = await config.rebuild();
        config.onBuild(result);
        return;
      }

      // 파일 변경만 있는 경우: metafile로 필터링
      if (!esbuildCtx.hasContext()) {
        config.onBuildStart();
        const result = await config.rebuild();
        config.onBuild(result);
        return;
      }

      const currentMetafile = esbuildCtx.getMetafile();
      if (currentMetafile == null) {
        config.onBuildStart();
        const result = await config.rebuild();
        config.onBuild(result);
        return;
      }

      // metafile 입력 기반 필터링
      const metafileAbsPaths = new Set(
        Object.keys(currentMetafile.inputs).map((key) => pathx.posixResolve(info.cwd, key)),
      );

      const hasRelevantChange = changes.some((c) => {
        if (metafileAbsPaths.has(c.path)) return true;
        // pnpm symlink 경로와 esbuild resolved 경로 불일치 대응
        try {
          const realPath = pathx.posix(fs.realpathSync(c.path));
          return metafileAbsPaths.has(realPath);
        } catch {
          return false;
        }
      });

      if (hasRelevantChange) {
        config.onBuildStart();
        const result = await config.rebuild();
        config.onBuild(result);
      } else {
        logger.debug("변경된 파일이 빌드에 포함되지 않아 리빌드 건너뜀");
      }
    } catch (err) {
      config.onError(errNs.message(err));
    }
  });

  return watcher;
}
