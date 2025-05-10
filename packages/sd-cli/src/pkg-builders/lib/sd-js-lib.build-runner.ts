import {
  FsUtils,
  ISdFsWatcherChangeInfo,
  PathUtils,
  SdLogger,
  TNormPath,
} from "@simplysm/sd-core-node";
import path from "path";
import { SdCliConvertMessageUtils } from "../../utils/sd-cli-convert-message.utils";
// import { TSdLintWorkerType } from "../../types/workers.type";
import { ESLint } from "eslint";
import { BuildRunnerBase, IBuildRunnerRunResult } from "../commons/build-runner.base";

export class SdJsLibBuildRunner extends BuildRunnerBase<"library"> {
  protected override _logger = SdLogger.get(["simplysm", "sd-cli", "SdJsLibBuildRunner"]);

  protected override async _runAsync(
    dev: boolean,
    modifiedFileSet?: Set<TNormPath>,
  ): Promise<IBuildRunnerRunResult> {
    const filePathSet = modifiedFileSet ?? new Set(
      FsUtils.glob(path.resolve(this._pkgPath, "src/**/*.js")).map(item => PathUtils.norm(item)),
    );

    this._debug("LINT...");

    const lintResults = await this._lintAsync(filePathSet);
    const messages = SdCliConvertMessageUtils.convertToBuildMessagesFromEslint(lintResults);

    this._debug(`LINT 완료`);

    return {
      affectedFileSet: filePathSet,
      buildMessages: messages,
      emitFileSet: new Set(),
    };
  }

  protected override _getModifiedFileSet(changeInfos: ISdFsWatcherChangeInfo[]) {
    return new Set(
      changeInfos.filter((item) =>
        FsUtils.exists(item.path)
        && PathUtils.isChildPath(item.path, path.resolve(this._pkgPath, "src")),
      ).map(item => item.path),
    );
  }

  private async _lintAsync(fileSet: Set<string>) {
    const lintFilePaths = Array.from(fileSet)
      .filter((item) => PathUtils.isChildPath(item, path.resolve(this._pkgPath, "src")))
      .filter((item) => item.endsWith(".js"))
      .filter((item) => FsUtils.exists(item));

    if (lintFilePaths.length === 0) {
      return [];
    }

    const linter = new ESLint({ cwd: this._pkgPath, cache: false });
    return await linter.lintFiles(lintFilePaths);
  }
}
