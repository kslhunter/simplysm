import esbuild from "esbuild";
import path from "path";
import {InitialFileRecord} from "@angular-devkit/build-angular/src/tools/esbuild/bundler-context";
import {ISdCliPackageBuildResult} from "../commons";
import {Logger} from "@simplysm/sd-core-node";

export class SdNgBundlerContext {
  readonly #logger = Logger.get(["simplysm", "sd-cli", "SdNgBundlerContext"]);

  private _context?: esbuild.BuildContext;

  public constructor(private readonly _pkgPath: string,
                     private readonly _esbuildOptions: esbuild.BuildOptions) {
  }

  public async bundleAsync() {
    if (this._context == null) {
      this._context = await esbuild.context(this._esbuildOptions);
    }

    let buildResult: esbuild.BuildResult;

    try {
      this.#debug(`rebuild...`);
      buildResult = await this._context.rebuild();
      this.#debug(`rebuild completed`);
    }
    catch (err) {
      if ("warnings" in err || "errors" in err) {
        buildResult = err;
      }
      else {
        throw err;
      }
    }

    this.#debug(`convert results...`);

    const results = [
      ...buildResult.warnings.map((warn) => ({
        filePath: warn.location?.file !== undefined ? path.resolve(this._pkgPath, warn.location.file) : undefined,
        line: warn.location?.line,
        char: warn.location?.column,
        code: warn.text.slice(0, warn.text.indexOf(":")),
        severity: "warning",
        message: `${warn.pluginName ? `(${warn.pluginName}) ` : ""} ${warn.text.slice(warn.text.indexOf(":") + 1)}`,
        type: "build"
      })),
      ...buildResult.errors.map((err) => ({
        filePath: err.location?.file !== undefined ? path.resolve(this._pkgPath, err.location.file) : undefined,
        line: err.location?.line,
        char: err.location?.column !== undefined ? err.location.column + 1 : undefined,
        code: err.text.slice(0, err.text.indexOf(":")),
        severity: "error",
        message: `${err.pluginName ? `(${err.pluginName}) ` : ""} ${err.text.slice(err.text.indexOf(":") + 1)}`,
        type: "build"
      }))
    ] as ISdCliPackageBuildResult[];

    const initialFiles = new Map<string, InitialFileRecord>();

    for (const outputFile of buildResult.outputFiles ?? []) {
      const relativeFilePath = path.isAbsolute(outputFile.path) ? path.relative(this._pkgPath, outputFile.path) : outputFile.path;
      const entryPoint = buildResult.metafile?.outputs[relativeFilePath]?.entryPoint;

      outputFile.path = relativeFilePath;

      if (entryPoint != null) {
        const name = path.basename(relativeFilePath).split('.', 1)[0];
        const type = path.extname(relativeFilePath) === '.css' ? 'style' : 'script';

        if (this._esbuildOptions.entryPoints?.[name] != null) {
          initialFiles.set(relativeFilePath, {
            name,
            type,
            entrypoint: true,
            serverFile: false
          });
        }
      }
    }

    const files = [...initialFiles.keys()];
    for (const file of files) {
      for (const initialImport of buildResult.metafile?.outputs[file]?.imports ?? []) {
        if (initialFiles.has(initialImport.path)) {
          continue;
        }

        if (initialImport.kind === 'import-statement' || initialImport.kind === 'import-rule') {
          const record: InitialFileRecord = {
            type: initialImport.kind === 'import-rule' ? 'style' : 'script',
            entrypoint: false,
            external: initialImport.external,
            serverFile: false
          };

          initialFiles.set(initialImport.path, record);

          if (!initialImport.external) {
            files.push(initialImport.path);
          }
        }
      }
    }

    // const dependencyMap = new Map<string, Set<string>>();
    // if (buildResult.metafile) {
    //   for (const [key, val] of Object.entries(buildResult.metafile.inputs)) {
    //     for (const imp of val.imports) {
    //       const deps = dependencyMap.getOrCreate(path.resolve(this._pkgPath, imp.path), new Set<string>());
    //       deps.add(path.resolve(this._pkgPath, key));
    //     }
    //   }
    // }

    return {
      results,
      initialFiles,
      outputFiles: buildResult.outputFiles,
      // dependencyMap,
      metafile: buildResult.metafile
    };
  }

  #debug(...msg: any[]): void {
    this.#logger.debug(`[${path.basename(this._pkgPath)}] (${Object.keys(this._esbuildOptions.entryPoints as Record<string, any>).join(", ")})`, ...msg);
  }
}