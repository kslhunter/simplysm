import esbuild from "esbuild";
import path from "path";
import {InitialFileRecord} from "@angular-devkit/build-angular/src/tools/esbuild/bundler-context";
import {ISdCliPackageBuildResult} from "../commons";

export class SdNgBundlerContext {
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
      buildResult = await this._context.rebuild();
    }
    catch (err) {
      if ("warnings" in err || "errors" in err) {
        buildResult = err;
      }
      else {
        throw err;
      }
    }

    const results = [
      ...buildResult.warnings.map((warn) => ({
        filePath: warn.location?.file !== undefined ? path.resolve(this._pkgPath, warn.location.file) : undefined,
        line: warn.location?.line,
        char: warn.location?.column,
        code: warn.text.slice(0, warn.text.indexOf(":")),
        severity: "warning",
        message: `${warn.pluginName != null ? `(${warn.pluginName}) ` : ""} ${warn.text.slice(warn.text.indexOf(":") + 1)}`,
        type: "build"
      })),
      ...buildResult.errors?.map((err) => ({
        filePath: err.location?.file !== undefined ? path.resolve(this._pkgPath, err.location.file) : undefined,
        line: err.location?.line,
        char: err.location?.column !== undefined ? err.location.column + 1 : undefined,
        code: err.text.slice(0, err.text.indexOf(":")),
        severity: "error",
        message: `${err.pluginName != null ? `(${err.pluginName}) ` : ""} ${err.text.slice(err.text.indexOf(":") + 1)}`,
        type: "build"
      }))
    ] as ISdCliPackageBuildResult[];

    const initialFiles = new Map<string, InitialFileRecord>();

    for (const outputFile of buildResult.outputFiles ?? []) {
      const relativeFilePath = path.relative(this._pkgPath, outputFile.path);
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
          };

          initialFiles.set(initialImport.path, record);

          if (!initialImport.external) {
            files.push(initialImport.path);
          }
        }
      }
    }

    const dependencyMap = new Map<string, Set<string>>();
    if (buildResult.metafile) {
      for (const [key, val] of Object.entries(buildResult.metafile.inputs)) {
        for (const imp of val.imports) {
          const deps = dependencyMap.getOrCreate(path.resolve(this._pkgPath, imp.path), new Set<string>());
          deps.add(path.resolve(this._pkgPath, key));
        }
      }
    }

    return {
      results,
      initialFiles,
      outputFiles: buildResult.outputFiles,
      dependencyMap,
      metafile: buildResult.metafile
    };
  }
}