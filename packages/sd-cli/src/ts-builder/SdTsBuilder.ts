import { ISdTsCompilerPrepareResult, SdTsCompiler } from "./SdTsCompiler";
import { TSdTsCompileWorkerType } from "../workers/compile/compile-worker.type";
import { TSdLintWorkerType } from "../workers/lint/lint-worker.type";
import { SdWorker } from "@simplysm/sd-core-node";

export class SdTsBuilder {
  static async new(opt: ConstructorParameters<typeof SdTsCompiler>[0]) {
    const compileWorker = new SdWorker<TSdTsCompileWorkerType>(
      import.meta.resolve("../workers/compile/compile-worker"),
    );
    await compileWorker.run("initialize", [opt]);

    const lintWorker = new SdWorker<TSdLintWorkerType>(import.meta.resolve("../workers/lint/lint-worker"));

    return new SdTsBuilder(compileWorker, lintWorker, opt.pkgPath);
  }

  private constructor(
    private _compileProc: SdWorker<TSdTsCompileWorkerType>,
    private _lintProc: SdWorker<TSdLintWorkerType>,
    private _pkgPath: string,
  ) {}

  public async invalidateAsync(modifiedFileSet: Set<string>) {
    await this._compileProc.run("invalidate", [modifiedFileSet]);
  }

  public async buildAsync() {
    const prepareResult: ISdTsCompilerPrepareResult = await this._compileProc.run("prepare", []);
    const [compileResult, lintResults] = await Promise.all([
      this._compileProc.run("build", [prepareResult.affectedFileSet]),
      this._lintProc.run("lint", [
        {
          cwd: this._pkgPath,
          fileSet: prepareResult.affectedFileSet,
        },
      ]),
    ]);

    return {
      ...prepareResult,
      ...compileResult,
      lintResults,
    };
  }
}
