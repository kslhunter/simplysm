import path from "path";
import { FsUtil, Logger, PathUtil } from "@simplysm/sd-core-node";
import { fileURLToPath } from "url";
import nodeStdLibBrowser from "node-stdlib-browser";
import nodeStdLibBrowserPlugin from "node-stdlib-browser/helpers/esbuild/plugin";
import { INpmConfig, ISdCliClientBuilderCordovaConfig, ISdCliPackageBuildResult } from "../commons";
import ts from "typescript";
import { SdReactBundlerContext } from "./SdReactBundlerContext";
import { IReactPluginResultCache, sdReactPlugin } from "../bundle-plugins/sdReactPlugin";
import { transformSupportedBrowsersToTargets } from "@angular/build/src/tools/esbuild/utils";
import browserslist from "browserslist";
import { glob } from "glob";

export class SdReactBundler {
  readonly #logger = Logger.get(["simplysm", "sd-cli", "SdNgBundler"]);

  readonly #modifiedFileSet = new Set<string>();
  readonly #compileResultCache: IReactPluginResultCache = {
    affectedFileSet: new Set<string>(),
    watchFileSet: new Set<string>(),
  };
  #contexts: SdReactBundlerContext[] | undefined;

  readonly #outputCache = new Map<string, string | number>();

  readonly #opt: IOptions;

  readonly #pkgNpmConf: INpmConfig;
  readonly #indexFilePath: string;
  readonly #tsConfigFilePath: string;
  readonly #browserTarget: string[];

  public constructor(opt: IOptions) {
    this.#opt = opt;
    this.#pkgNpmConf = FsUtil.readJson(path.resolve(opt.pkgPath, "package.json"));
    this.#indexFilePath = path.resolve(opt.pkgPath, "src/index.tsx");
    this.#tsConfigFilePath = path.resolve(opt.pkgPath, "tsconfig.json");
    this.#browserTarget = transformSupportedBrowsersToTargets(
      browserslist(opt.browserslist ?? ["last 2 Chrome versions", "last 2 Edge versions"]),
    );
  }

  public markForChanges(filePaths: string[]): void {
    for (const filePath of filePaths) {
      this.#modifiedFileSet.add(path.normalize(filePath));
    }
  }

  public async bundleAsync(): Promise<{
    program?: ts.Program;
    watchFileSet: Set<string>;
    affectedFileSet: Set<string>;
    results: ISdCliPackageBuildResult[];
  }> {
    this.#debug(`get contexts...`);

    if (!this.#contexts) {
      this.#contexts = [
        this._getAppContext(),
        ...(this.#opt.builderType === "electron" ? [this._getElectronMainContext()] : []),
      ];
    }

    this.#debug(`build...`);

    const bundlingResults = await this.#contexts.mapAsync(async (ctx, i) => await ctx.bundleAsync());

    //-- results
    const results = bundlingResults.mapMany((bundlingResult) => bundlingResult.results);

    this.#debug(`convert result...`);

    const outputFiles: IReactOutputFile[] = bundlingResults
      .mapMany((item) => item.outputFiles ?? [])
      .map((item) => ({
        relPath: path.relative(this.#opt.pkgPath, item.path),
        contents: item.contents,
      }));

    // cordova empty
    if (this.#opt.builderType === "cordova" && this.#opt.cordovaConfig?.plugins) {
      outputFiles.push({ relPath: "cordova-empty.js", contents: "export default {};" });
    }

    // index.html
    let indexHtml = await FsUtil.readFileAsync(path.resolve(this.#opt.pkgPath, "src/index.html"));
    indexHtml = indexHtml.replace(/<\/head>/, '<script type="module" src="index.js"></script></head>');
    if (this.#opt.builderType === "cordova") {
      indexHtml = indexHtml.replace(
        /(.*)<\/head>/,
        '<script type="module" src="cordova-entry.js"></script>\n$1</head>',
      );
    }
    if (outputFiles.some(item => item.relPath === "index.css")) {
      indexHtml = indexHtml.replace(
        /(.*)<\/head>/,
        '<link rel="stylesheet" href="index.css">\n$1</head>',
      );
    }

    outputFiles.push({
      relPath: "index.html",
      contents: indexHtml,
    });

    // copy assets
    outputFiles.push(
      ...this.#copyAssets("src", "favicon.ico"),
      ...this.#copyAssets("src", "manifest.webmanifest"),
      ...this.#copyAssets("src/assets", "**/*", "assets"),
      ...(this.#opt.dev && this.#opt.builderType === "cordova"
        ? Object.keys(this.#opt.cordovaConfig?.platform ?? { browser: {} }).mapMany((platform) => [
            ...this.#copyAssets(
              `.cordova/platforms/${platform}/platform_www/plugins`,
              "**/*",
              `cordova-${platform}/plugins`,
            ),
            ...this.#copyAssets(`.cordova/platforms/${platform}/platform_www`, "cordova.js", `cordova-${platform}`),
            ...this.#copyAssets(
              `.cordova/platforms/${platform}/platform_www`,
              "cordova_plugins.js",
              `cordova-${platform}`,
            ),
            ...this.#copyAssets(`.cordova/platforms/${platform}/www`, "config.xml", `cordova-${platform}`),
          ])
        : []),
    );

    // TODO: extract 3rdpartylicenses
    // TODO: service worker

    //-- write
    this.#debug(`write output files...(${outputFiles.length})`);

    for (const outputFile of outputFiles) {
      const distFilePath = path.resolve(this.#opt.outputPath, outputFile.relPath);
      const prev = this.#outputCache.get(distFilePath);
      if (prev !== Buffer.from(outputFile.contents).toString("base64")) {
        await FsUtil.writeFileAsync(distFilePath, outputFile.contents);
        this.#outputCache.set(distFilePath, Buffer.from(outputFile.contents).toString("base64"));
      }
    }

    this.#debug(`번들링중 영향받은 파일`, Array.from(this.#compileResultCache.affectedFileSet!));

    return {
      program: this.#compileResultCache.program,
      watchFileSet: new Set(this.#compileResultCache.watchFileSet),
      affectedFileSet: this.#compileResultCache.affectedFileSet!,
      results,
    };
  }

  #copyAssets(srcDir: string, globPath: string, distDir?: string): IReactOutputFile[] {
    const result: IReactOutputFile[] = [];
    const srcGlobPath = path.resolve(this.#opt.pkgPath, srcDir, globPath);
    const srcPaths = glob.sync(srcGlobPath);
    for (const srcPath of srcPaths) {
      if (!FsUtil.exists(srcPath)) continue;
      result.push({
        relPath: path.join(
          ...[distDir, path.relative(path.resolve(this.#opt.pkgPath, srcDir), srcPath)].filterExists(),
        ),
        contents: FsUtil.readFile(srcPath),
      });
    }

    return result;
  }

  private _getAppContext() {
    return new SdReactBundlerContext(this.#opt.pkgPath, {
      absWorkingDir: this.#opt.pkgPath,
      bundle: true,
      keepNames: true,
      format: "esm",
      assetNames: "media/[name]",
      conditions: ["es2020", "es2015", "module"],
      resolveExtensions: [".js", ".mjs", ".cjs", ".ts", ".tsx"],
      metafile: true,
      legalComments: this.#opt.dev ? "eof" : "none",
      logLevel: "silent",
      minifyIdentifiers: !this.#opt.dev,
      minifySyntax: !this.#opt.dev,
      minifyWhitespace: !this.#opt.dev,
      pure: ["forwardRef"],
      outdir: this.#opt.pkgPath,
      outExtension: undefined,
      sourcemap: true, //this.#opt.dev,
      splitting: true,
      chunkNames: "[name]-[hash]",
      tsconfig: this.#tsConfigFilePath,
      write: false,
      preserveSymlinks: false,
      define: {
        ...(!this.#opt.dev ? { ngDevMode: "false" } : {}),
        "ngJitMode": "false",
        "global": "global",
        "process": "process",
        "Buffer": "Buffer",
        "process.env.SD_VERSION": JSON.stringify(this.#pkgNpmConf.version),
        "process.env.NODE_ENV": JSON.stringify(this.#opt.dev ? "development" : "production"),
        ...(this.#opt.env
          ? Object.keys(this.#opt.env).toObject(
              (key) => `process.env.${key}`,
              (key) => JSON.stringify(this.#opt.env![key]),
            )
          : {}),
      },
      platform: "browser",
      mainFields: ["es2020", "es2015", "browser", "module", "main"],
      entryNames: "[name]",
      entryPoints: {
        index: this.#indexFilePath,
      },
      external: ["electron"],
      target: this.#browserTarget,
      supported: { "async-await": false, "object-rest-spread": false },
      loader: {
        ".png": "file",
        ".jpeg": "file",
        ".jpg": "file",
        ".jfif": "file",
        ".gif": "file",
        ".svg": "file",
        ".woff": "file",
        ".woff2": "file",
        ".ttf": "file",
        ".ttc": "file",
        ".eot": "file",
        ".ico": "file",
        ".otf": "file",
        ".csv": "file",
        ".xlsx": "file",
        ".xls": "file",
        ".pptx": "file",
        ".ppt": "file",
        ".docx": "file",
        ".doc": "file",
        ".zip": "file",
        ".pfx": "file",
        ".pkl": "file",
        ".mp3": "file",
        ".ogg": "file",
      },
      inject: [PathUtil.posix(fileURLToPath(import.meta.resolve("node-stdlib-browser/helpers/esbuild/shim")))],
      plugins: [
        ...(this.#opt.builderType === "cordova" && this.#opt.cordovaConfig?.plugins
          ? [
              {
                name: "cordova:plugin-empty",
                setup: ({ onResolve }) => {
                  onResolve({ filter: new RegExp("(" + this.#opt.cordovaConfig!.plugins!.join("|") + ")") }, () => {
                    return {
                      path: `./cordova-empty.js`,
                      external: true,
                    };
                  });
                },
              },
            ]
          : []),
        sdReactPlugin({
          modifiedFileSet: this.#modifiedFileSet,
          dev: this.#opt.dev,
          pkgPath: this.#opt.pkgPath,
          result: this.#compileResultCache,
        }),
        nodeStdLibBrowserPlugin(nodeStdLibBrowser),
      ],
    });
  }

  private _getElectronMainContext() {
    return new SdReactBundlerContext(this.#opt.pkgPath, {
      absWorkingDir: this.#opt.pkgPath,
      bundle: true,
      entryNames: "[name]",
      assetNames: "media/[name]",
      conditions: ["es2020", "es2015", "module"],
      resolveExtensions: [".js", ".mjs", ".cjs", ".ts"],
      metafile: true,
      legalComments: this.#opt.dev ? "eof" : "none",
      logLevel: "silent",
      minify: !this.#opt.dev,
      outdir: this.#opt.pkgPath,
      sourcemap: true, //this.#opt.dev,
      tsconfig: this.#tsConfigFilePath,
      write: false,
      preserveSymlinks: false,
      external: ["electron"],
      define: {
        ...(!this.#opt.dev ? { ngDevMode: "false" } : {}),
        "process.env.SD_VERSION": JSON.stringify(this.#pkgNpmConf.version),
        "process.env.NODE_ENV": JSON.stringify(this.#opt.dev ? "development" : "production"),
        ...(this.#opt.env
          ? Object.keys(this.#opt.env).toObject(
              (key) => `process.env.${key}`,
              (key) => JSON.stringify(this.#opt.env![key]),
            )
          : {}),
      },
      platform: "node",
      entryPoints: {
        "electron-main": path.resolve(this.#opt.pkgPath, "src/electron-main.ts"),
      },
    });
  }

  #debug(...msg: any[]): void {
    this.#logger.debug(`[${path.basename(this.#opt.pkgPath)}]`, ...msg);
  }
}

interface IOptions {
  dev: boolean;
  outputPath: string;
  pkgPath: string;
  builderType: string;
  env: Record<string, string> | undefined;
  cordovaConfig: ISdCliClientBuilderCordovaConfig | undefined;
  browserslist: string[] | undefined;
}

interface IReactOutputFile {
  relPath: string;
  contents: Uint8Array | string;
}
