import { SdWorker, TNormPath } from "@simplysm/sd-core-node";
import { TSdTsCompileWorkerType } from "../types/workers.type";
import { SdTsCompilerOptions } from "../types/ts-compiler.type";

export class SdTsCompileWorker {
  static async new(opt: SdTsCompilerOptions) {
    const compileWorker = new SdWorker<TSdTsCompileWorkerType>(import.meta.resolve("../workers/compile-worker"));
    await compileWorker.run("initialize", [opt]);

    return new SdTsCompileWorker(compileWorker, opt.pkgPath);
  }

  private constructor(
    private _compileProc: SdWorker<TSdTsCompileWorkerType>,
    private _pkgPath: string,
  ) {}

  public async compileAsync(modifiedFileSet: Set<TNormPath>) {
    return await this._compileProc.run("compile", [modifiedFileSet]);
  }
}
