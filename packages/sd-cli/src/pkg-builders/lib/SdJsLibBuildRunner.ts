import type { TNormPath } from "@simplysm/sd-core-node";
import { FsUtils, PathUtils, SdLogger } from "@simplysm/sd-core-node";
import path from "path";
import { ESLint } from "eslint";
import { SdBuildRunnerBase } from "../SdBuildRunnerBase";
import type { ISdBuildResult } from "../../types/build/ISdBuildResult";
import { SdCliConvertMessageUtils } from "../../utils/SdCliConvertMessageUtils";

export class SdJsLibBuildRunner extends SdBuildRunnerBase<"library"> {
  protected override _logger = SdLogger.get(["simplysm", "sd-cli", "SdJsLibBuildRunner"]);

  protected override async _runAsync(modifiedFileSet?: Set<TNormPath>): Promise<ISdBuildResult> {
    if (this._opt.watch?.emitOnly) {
      return {
        buildMessages: [],

        watchFileSet: new Set(),
        affectedFileSet: new Set(),
        emitFileSet: new Set(),
      };
    }

    const filePathSet =
      modifiedFileSet ??
      new Set(
        FsUtils.glob(path.resolve(this._opt.pkgPath, "src/**/*.js")).map((item) =>
          PathUtils.norm(item),
        ),
      );

    this._debug("LINT...");

    const lintResults = await this._lintAsync(filePathSet);
    const messages = SdCliConvertMessageUtils.convertToBuildMessagesFromEslint(lintResults);

    this._debug(`LINT 완료`);

    return {
      buildMessages: messages,

      watchFileSet: filePathSet,
      affectedFileSet: filePathSet,
      emitFileSet: new Set(),
    };
  }

  private async _lintAsync(fileSet: Set<string>) {
    const lintFilePaths = Array.from(fileSet)
      .filter((item) => PathUtils.isChildPath(item, path.resolve(this._opt.pkgPath, "src")))
      .filter((item) => item.endsWith(".js"))
      .filter((item) => FsUtils.exists(item));

    if (lintFilePaths.length === 0) {
      return [];
    }

    const linter = new ESLint({ cwd: this._opt.pkgPath, cache: false });
    return await linter.lintFiles(lintFilePaths);
  }
}
