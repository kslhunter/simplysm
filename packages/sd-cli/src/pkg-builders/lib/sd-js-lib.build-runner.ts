import { FsUtils, SdLogger, PathUtils, SdFsWatcher } from "@simplysm/sd-core-node";
import path from "path";
import { EventEmitter } from "events";
import { SdCliConvertMessageUtils } from "../../utils/sd-cli-convert-message.utils";
// import { TSdLintWorkerType } from "../../types/workers.type";
import { ISdProjectConfig } from "../../types/config.types";
import { ISdBuildRunnerResult } from "../../types/build.types";
import { ESLint } from "eslint";

export class SdJsLibBuildRunner extends EventEmitter {
  private readonly _logger = SdLogger.get(["simplysm", "sd-cli", "SdJsLibBuildRunner"]);
  private readonly _pkgName: string;

  // private readonly _lintWorker: SdWorker<TSdLintWorkerType>;

  public constructor(
    private readonly _projConf: ISdProjectConfig,
    private readonly _pkgPath: string,
  ) {
    super();
    this._pkgName = path.basename(_pkgPath);

    // this._lintWorker = new SdWorker(import.meta.resolve("../../workers/lint-worker"));
  }

  public override on(event: "change", listener: () => void): this;
  public override on(event: "complete", listener: (result: ISdBuildRunnerResult) => void): this;
  public override on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  public async buildAsync(): Promise<ISdBuildRunnerResult> {
    this._debug("LINT...");
    const srcGlobPath = path.resolve(this._pkgPath, "src/**/*.js");
    const srcFilePaths = FsUtils.glob(srcGlobPath);

    const lintResults = await this.#lintAsync(new Set(srcFilePaths));
    const messages = SdCliConvertMessageUtils.convertToBuildMessagesFromEslint(lintResults);

    this._debug(`LINT 완료`);
    return {
      affectedFilePathSet: new Set(srcFilePaths.map((item) => PathUtils.norm(item))),
      buildMessages: messages,
      emitFileSet: new Set(),
    };
  }

  public async watchAsync(): Promise<void> {
    this.emit("change");
    this._debug("LINT...");
    const srcGlobPath = path.resolve(this._pkgPath, "src/**/*.js");
    const srcFilePaths = FsUtils.glob(srcGlobPath);

    const lintResults = await this.#lintAsync(new Set(srcFilePaths));
    const messages = SdCliConvertMessageUtils.convertToBuildMessagesFromEslint(lintResults);

    this._debug(`LINT 완료`);
    const res: ISdBuildRunnerResult = {
      affectedFilePathSet: new Set(srcFilePaths.map((item) => PathUtils.norm(item))),
      buildMessages: messages,
      emitFileSet: new Set(),
    };
    this.emit("complete", res);

    SdFsWatcher.watch([srcGlobPath]).onChange({ delay: 100 }, async (changeInfos) => {
      const watchFilePaths = changeInfos.filter((item) => FsUtils.exists(item.path)).map((item) => item.path);
      if (watchFilePaths.length < 1) return;

      this.emit("change");

      this._debug("LINT...");

      const watchLintResults = await this.#lintAsync(new Set(watchFilePaths));
      const watchMessages = SdCliConvertMessageUtils.convertToBuildMessagesFromEslint(watchLintResults);

      this._debug(`LINT 완료`);

      const watchRes: ISdBuildRunnerResult = {
        affectedFilePathSet: new Set(changeInfos.map((item) => PathUtils.norm(item.path))),
        buildMessages: watchMessages,
        emitFileSet: new Set(),
      };

      this.emit("complete", watchRes);
    });
  }

  async #lintAsync(fileSet: Set<string>) {
    const lintFilePaths = Array.from(fileSet)
      .filter((item) => PathUtils.isChildPath(item, this._pkgPath))
      .filter((item) => item.endsWith(".js"))
      .filter((item) => FsUtils.exists(item));

    if (lintFilePaths.length === 0) {
      return [];
    }

    const linter = new ESLint({ cwd: this._pkgPath, cache: false });
    return await linter.lintFiles(lintFilePaths);
  }

  private _debug(msg: string): void {
    this._logger.debug(`[${this._pkgName}] ${msg}`);
  }
}
