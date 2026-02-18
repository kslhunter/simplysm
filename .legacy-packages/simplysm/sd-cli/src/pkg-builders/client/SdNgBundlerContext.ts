import esbuild from "esbuild";
import path from "path";
import { SdLogger } from "@simplysm/sd-core-node";
import { SdCliConvertMessageUtils } from "../../utils/SdCliConvertMessageUtils";

// import { InitialFileRecord } from "@angular/build/src/tools/esbuild/bundler-context";

interface InitialFileRecord {
  entrypoint: boolean;
  name?: string;
  type: "script" | "style";
  external?: boolean;
  serverFile: boolean;
  depth: number;
}

export class SdNgBundlerContext {
  private readonly _logger = SdLogger.get(["simplysm", "sd-cli", "SdNgBundlerContext"]);

  private _context?: esbuild.BuildContext;

  constructor(
    private readonly _pkgPath: string,
    private readonly _watch: boolean,
    private readonly _esbuildOptions: esbuild.BuildOptions,
  ) {}

  async bundleAsync() {
    let esbuildResult: esbuild.BuildResult;

    this._debug(`Building...`);
    if (this._watch) {
      if (this._context == null) {
        this._context = await esbuild.context(this._esbuildOptions);
      }

      try {
        esbuildResult = await this._context.rebuild();
      } catch (err) {
        if (err != null && typeof err === "object" && ("warnings" in err || "errors" in err)) {
          esbuildResult = err as esbuild.BuildResult;
        } else {
          throw err;
        }
      }
    } else {
      try {
        esbuildResult = await esbuild.build(this._esbuildOptions);
      } catch (err) {
        if (err != null && typeof err === "object" && ("warnings" in err || "errors" in err)) {
          esbuildResult = err as esbuild.BuildResult;
        } else {
          throw err;
        }
      }
    }
    this._debug(`Build completed`);

    this._debug(`Converting results...`);
    const results = SdCliConvertMessageUtils.convertToBuildMessagesFromEsbuild(
      esbuildResult,
      this._pkgPath,
    );

    const initialFiles = new Map<string, InitialFileRecord>();

    for (const outputFile of esbuildResult.outputFiles ?? []) {
      const relativeFilePath = path.isAbsolute(outputFile.path)
        ? path.relative(this._pkgPath, outputFile.path)
        : outputFile.path;
      const entryPoint = esbuildResult.metafile?.outputs[relativeFilePath]?.entryPoint;

      outputFile.path = relativeFilePath;

      if (entryPoint != null) {
        const name = path.basename(relativeFilePath).split(".", 1)[0];
        const type = path.extname(relativeFilePath) === ".css" ? "style" : "script";

        const entryPointsRec = this._esbuildOptions.entryPoints as
          | Record<string, string>
          | undefined;
        if (entryPointsRec?.[name] != null) {
          initialFiles.set(relativeFilePath, {
            name,
            type,
            entrypoint: true,
            serverFile: false,
            depth: 0,
          });
        }
      }
    }

    const files = [...initialFiles.keys()];
    for (const file of files) {
      const entryRecord = initialFiles.get(file)!;

      for (const initialImport of esbuildResult.metafile?.outputs[file]?.imports ?? []) {
        const existingRecord = initialFiles.get(initialImport.path);
        if (existingRecord) {
          if (existingRecord.depth > entryRecord.depth + 1) {
            existingRecord.depth = entryRecord.depth + 1;
          }
          continue;
        }

        if (initialImport.kind === "import-statement" || initialImport.kind === "import-rule") {
          const record: InitialFileRecord = {
            type: initialImport.kind === "import-rule" ? "style" : "script",
            entrypoint: false,
            external: initialImport.external,
            serverFile: false,
            depth: entryRecord.depth + 1,
          };

          initialFiles.set(initialImport.path, record);

          if (!initialImport.external) {
            files.push(initialImport.path);
          }
        }
      }
    }

    return {
      results,
      initialFiles,
      outputFiles: esbuildResult.outputFiles,
      metafile: esbuildResult.metafile,
    };
  }

  private _debug(...msg: any[]): void {
    this._logger.debug(
      `[${path.basename(this._pkgPath)}] (${Object.keys(
        this._esbuildOptions.entryPoints as Record<string, any>,
      ).join(", ")})`,
      ...msg,
    );
  }
}
