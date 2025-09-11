import path from "path";
import esbuild, { Metafile } from "esbuild";
import { FsUtils, HashUtils, PathUtils, SdLogger, TNormPath } from "@simplysm/sd-core-node";
import { fileURLToPath } from "url";
import nodeStdLibBrowser from "node-stdlib-browser";
import nodeStdLibBrowserPlugin from "node-stdlib-browser/helpers/esbuild/plugin";
import browserslist from "browserslist";
import { SdNgBundlerContext } from "./SdNgBundlerContext";
import { MemoryLoadResultCache } from "@angular/build/src/tools/esbuild/load-result-cache";
import {
  convertOutputFile,
  createOutputFile,
  transformSupportedBrowsersToTargets,
} from "@angular/build/src/tools/esbuild/utils";
import {
  BuildOutputFile,
  BuildOutputFileType,
  InitialFileRecord,
} from "@angular/build/src/tools/esbuild/bundler-context";
import { extractLicenses } from "@angular/build/src/tools/esbuild/license-extractor";
import {
  HintMode,
  IndexHtmlGenerator,
  IndexHtmlProcessResult,
} from "@angular/build/src/utils/index-file/index-html-generator";
import { Entrypoint } from "@angular/build/src/utils/index-file/augment-index-html";
import { CrossOrigin } from "@angular/build/src/builders/application/schema";
import { augmentAppWithServiceWorkerEsbuild } from "@angular/build/src/utils/service-worker";
import { createSourcemapIgnorelistPlugin } from "@angular/build/src/tools/esbuild/sourcemap-ignorelist-plugin";
import { StylesheetPluginFactory } from "@angular/build/src/tools/esbuild/stylesheets/stylesheet-plugin-factory";
import { SassStylesheetLanguage } from "@angular/build/src/tools/esbuild/stylesheets/sass-language";
import { CssStylesheetLanguage } from "@angular/build/src/tools/esbuild/stylesheets/css-language";
import { createCssResourcePlugin } from "@angular/build/src/tools/esbuild/stylesheets/css-resource-plugin";
import { resolveAssets } from "@angular/build/src/utils/resolve-assets";
import { createSdNgPlugin } from "./createSdNgPlugin";
import { SdCliPerformanceTimer } from "../../utils/SdCliPerformanceTimer";
import { ISdClientPackageConfig } from "../../types/config/ISdProjectConfig";
import nodeModule from "module";
import { ISdCliNgPluginResultCache } from "../../types/plugin/ISdCliNgPluginResultCache";
import { INpmConfig } from "../../types/common-config/INpmConfig";
import { ISdBuildResult } from "../../types/build/ISdBuildResult";
import { ISdTsCompilerOptions } from "../../types/build/ISdTsCompilerOptions";

export class SdNgBundler {
  #logger = SdLogger.get(["simplysm", "sd-cli", "SdNgBundler"]);

  #modifiedFileSet = new Set<TNormPath>();
  #ngResultCache: ISdCliNgPluginResultCache = {
    affectedFileSet: new Set<TNormPath>(),
    watchFileSet: new Set<TNormPath>(),
  };
  #styleLoadResultCache = new MemoryLoadResultCache();

  #contexts: SdNgBundlerContext[] | undefined;

  #outputHashCache = new Map<TNormPath, string>();

  #pkgNpmConf: INpmConfig;
  #mainFilePath: string;
  #tsConfigFilePath: string;
  #swConfFilePath: string;
  #browserTarget: string[];
  #indexHtmlFilePath: string;
  #pkgName: string;
  #baseHref: string;
  #outputPath: string;

  constructor(
    private readonly _opt: ISdTsCompilerOptions,
    private readonly _conf: IConf<any>,
  ) {
    this.#pkgNpmConf = FsUtils.readJson(path.resolve(this._opt.pkgPath, "package.json"));
    this.#mainFilePath = path.resolve(this._opt.pkgPath, "src/main.ts");
    this.#tsConfigFilePath = path.resolve(this._opt.pkgPath, "tsconfig.json");
    this.#swConfFilePath = path.resolve(this._opt.pkgPath, "ngsw-config.json");
    this.#browserTarget = transformSupportedBrowsersToTargets(browserslist(["Chrome > 78"]));
    this.#indexHtmlFilePath = path.resolve(this._opt.pkgPath, "src/index.html");
    this.#pkgName = path.basename(this._opt.pkgPath);
    this.#baseHref =
      this._conf.builderType === "web"
        ? `/${this.#pkgName}/`
        : this._opt.watch?.dev
          ? `/${this.#pkgName}/${this._conf.builderType}/`
          : ``;
    this.#outputPath =
      this._conf.builderType === "web"
        ? PathUtils.norm(this._opt.pkgPath, "dist")
        : this._conf.builderType === "electron" && !this._opt.watch?.dev
          ? PathUtils.norm(this._opt.pkgPath, ".electron/src")
          : this._conf.builderType === "cordova" && !this._opt.watch?.dev
            ? PathUtils.norm(this._opt.pkgPath, ".cordova/www")
            : PathUtils.norm(this._opt.pkgPath, "dist", this._conf.builderType);
  }

  markForChanges(filePaths: string[]): void {
    for (const filePath of filePaths) {
      this.#modifiedFileSet.add(PathUtils.norm(filePath));
      this.#styleLoadResultCache.invalidate(PathUtils.norm(filePath));
      /*if (this.#styleLoadResultCache.invalidate(PathUtils.norm(filePath))) {
        this.#styleLoadResultCache.invalidate(PathUtils.norm(this._opt.pkgPath, "src/styles.scss"));
      }*/
    }
    // this._sourceFileCache.invalidate(filePaths);
  }

  async bundleAsync(): Promise<ISdBuildResult> {
    const perf = new SdCliPerformanceTimer("ng bundle");

    this.#debug(`Preparing build contexts...`);

    if (!this.#contexts) {
      this.#contexts = await perf.run("Preparing build contexts", async () => [
        await this.#getAppContextAsync(),
        ...(FsUtils.exists(path.resolve(this._opt.pkgPath, "src/styles.scss"))
          ? [this.#getStyleContext()]
          : []),
        ...(this._conf.builderType === "electron" ? [this.#getElectronMainContext()] : []),
      ]);
    }

    this.#debug("Bundling...");

    const bundlingResults = await perf.run("Bundling", async () => {
      return await this.#contexts!.mapAsync(async (ctx) => await ctx.bundleAsync());
    });

    //-- results
    const buildMessages = bundlingResults.mapMany((bundlingResult) => bundlingResult.results);

    if (this._opt.watch?.noEmit) {
      return {
        watchFileSet: this.#ngResultCache.watchFileSet!,
        affectedFileSet: this.#ngResultCache.affectedFileSet!,
        buildMessages,
        emitFileSet: new Set<TNormPath>(),
      };
    } else {
      this.#debug(`Converting build results...`);

      const outputFiles: BuildOutputFile[] = bundlingResults.mapMany(
        (item) =>
          item.outputFiles?.map((file) => convertOutputFile(file, BuildOutputFileType.Root)) ?? [],
      );
      const initialFiles = new Map<string, InitialFileRecord>();
      const metafile: {
        inputs: Metafile["inputs"];
        outputs: Metafile["outputs"];
      } = {
        inputs: {},
        outputs: {},
      };
      for (const bundlingResult of bundlingResults) {
        bundlingResult.initialFiles.forEach((v, k) => initialFiles.set(k, v));
        metafile.inputs = { ...metafile.inputs, ...bundlingResult.metafile?.inputs };
        metafile.outputs = { ...metafile.outputs, ...bundlingResult.metafile?.outputs };
      }

      //-- cordova empty
      /*if (this._opt.builderType === "cordova" && this._opt.cordovaConfig?.plugins) {
        outputFiles.push(createOutputFile("cordova-empty.js", "export default {};", BuildOutputFileType.Root));
      }*/

      this.#debug(`Generating index.html...`);
      await perf.run("Generating index.html", async () => {
        const genIndexHtmlResult = await this.#genIndexHtmlAsync(outputFiles, initialFiles);
        for (const warning of genIndexHtmlResult.warnings) {
          buildMessages.push({
            filePath: undefined,
            line: undefined,
            char: undefined,
            code: undefined,
            severity: "warning",
            message: `${warning}`,
            type: "gen-index",
          });
        }
        for (const error of genIndexHtmlResult.errors) {
          buildMessages.push({
            filePath: undefined,
            line: undefined,
            char: undefined,
            code: undefined,
            severity: "error",
            message: `${error}`,
            type: "gen-index",
          });
        }
        outputFiles.push(
          createOutputFile("index.html", genIndexHtmlResult.csrContent, BuildOutputFileType.Root),
        );
      });

      this.#debug(`Processing assets...`);
      const assetFiles: { source: string; destination: string }[] = [];
      await perf.run("Processing assets", async () => {
        //-- copy assets
        assetFiles.push(...(await this.#copyAssetsAsync()));

        //-- extract 3rdpartylicenses
        if (!this._opt.watch?.dev) {
          outputFiles.push(
            createOutputFile(
              "3rdpartylicenses.txt",
              await extractLicenses(metafile, this._opt.pkgPath),
              BuildOutputFileType.Root,
            ),
          );
        }
      });

      //-- service worker
      if (FsUtils.exists(this.#swConfFilePath) && !this._opt.watch?.dev) {
        this.#debug(`Preparing service worker...`);

        await perf.run("Preparing service worker", async () => {
          try {
            const serviceWorkerResult = await this.#genServiceWorkerAsync(outputFiles, assetFiles);
            outputFiles.push(
              createOutputFile("ngsw.json", serviceWorkerResult.manifest, BuildOutputFileType.Root),
            );
            assetFiles.push(...serviceWorkerResult.assetFiles);
          } catch (err) {
            buildMessages.push({
              filePath: undefined,
              line: undefined,
              char: undefined,
              code: undefined,
              severity: "error",
              message: `${err.toString()}`,
              type: "gen-sw",
            });
          }
        });
      }

      //-- write
      this.#debug(`Writing output files...(${outputFiles.length})`);

      const emitFileSet = new Set<TNormPath>();
      await perf.run("Writing output file", async () => {
        await Promise.all([
          outputFiles.parallelAsync(async (outputFile) => {
            const distFilePath = PathUtils.norm(this.#outputPath, outputFile.path);
            const prevHash = this.#outputHashCache.get(distFilePath);
            const currHash = HashUtils.get(Buffer.from(outputFile.contents));
            if (prevHash !== currHash) {
              await FsUtils.writeFileAsync(distFilePath, outputFile.contents);
              this.#outputHashCache.set(distFilePath, currHash);
              emitFileSet.add(distFilePath);
            }
          }),
          assetFiles.parallelAsync(async (assetFile) => {
            const prevHash = this.#outputHashCache.get(PathUtils.norm(assetFile.source));
            const currHash = HashUtils.get(await FsUtils.readFileBufferAsync(assetFile.source));
            if (prevHash !== currHash) {
              await FsUtils.copyAsync(
                assetFile.source,
                path.resolve(this.#outputPath, assetFile.destination),
              );
              this.#outputHashCache.set(PathUtils.norm(assetFile.source), currHash);
              emitFileSet.add(PathUtils.norm(this.#outputPath, assetFile.destination));
            }
          }),
        ]);
      });

      this.#debug(`Build performance summary:\n${perf.toString()}`);

      return {
        watchFileSet: new Set([
          ...this.#ngResultCache.watchFileSet!,
          ...this.#styleLoadResultCache.watchFiles.map((item) => PathUtils.norm(item)),
          ...assetFiles.map((item) => PathUtils.norm(item.source)),
          PathUtils.norm(this.#indexHtmlFilePath),
        ]),
        affectedFileSet: this.#ngResultCache.affectedFileSet!,
        buildMessages,
        emitFileSet: emitFileSet,
      };
    }
  }

  async #genIndexHtmlAsync(
    outputFiles: esbuild.OutputFile[],
    initialFiles: Map<string, InitialFileRecord>,
  ): Promise<IndexHtmlProcessResult> {
    const readAsset = (filePath: string): Promise<string> => {
      const relFilePath = path.relative("/", filePath);
      const currFile = outputFiles.find((outputFile) => outputFile.path === relFilePath);
      if (currFile) {
        return Promise.resolve(currFile.text);
      }

      throw new Error(`Output file does not exist: ${relFilePath}`);
    };

    const indexHtmlGenerator = new IndexHtmlGenerator({
      indexPath: this.#indexHtmlFilePath,
      entrypoints: [
        ["polyfills", true],
        ["styles", false],
        ["main", true],
        ...(this._conf.builderType === "cordova" ? [["cordova-entry", true] as Entrypoint] : []),
      ],
      sri: false,
      optimization: {
        scripts: !this._opt.watch?.dev,
        styles: {
          minify: !this._opt.watch?.dev,
          inlineCritical: !this._opt.watch?.dev,
          removeSpecialComments: !this._opt.watch?.dev,
        },
        fonts: { inline: !this._opt.watch?.dev },
      },
      crossOrigin: CrossOrigin.None,
      generateDedicatedSSRContent: false,
    });
    indexHtmlGenerator.readAsset = readAsset;

    const modulePreloads: { url: string; mode: HintMode; depth: number }[] = [];
    const hints: { url: string; mode: HintMode; as?: string }[] = [];
    if (!this._opt.watch?.dev) {
      for (const [key, value] of initialFiles) {
        if (value.entrypoint || value.serverFile) {
          continue;
        }

        if (value.type === "script") {
          modulePreloads.push({ url: key, mode: "modulepreload" as const, depth: value.depth });
        }
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        else if (value.type === "style") {
          hints.push({ url: key, mode: "preload" as const, as: "style" });
        }
      }
      modulePreloads.sort((a, b) => a.depth - b.depth);
      hints.push(...modulePreloads.slice(0, 10));
    }

    return await indexHtmlGenerator.process({
      baseHref: this.#baseHref,
      lang: undefined,
      outputPath: "/",
      files: [...initialFiles].map(([file, record]) => ({
        name: record.name ?? "",
        file,
        extension: path.extname(file),
      })),
      hints,
    });
  }

  async #copyAssetsAsync(): Promise<
    {
      source: string;
      destination: string;
    }[]
  > {
    return await resolveAssets(
      [
        { input: "public", glob: "**/*", output: "." },
        ...(this._opt.watch?.dev ? [{ input: "public-dev", glob: "**/*", output: "." }] : []),
        ...(this._opt.watch?.dev && this._conf.builderType === "cordova"
          ? Object.keys(this._conf.builderConfig?.platform ?? { browser: {} }).mapMany(
              (platform) => [
                {
                  input: `.cordova/platforms/${platform}/platform_www/plugins`,
                  glob: "**/*",
                  output: `cordova-${platform}/plugins`,
                },
                {
                  input: `.cordova/platforms/${platform}/platform_www`,
                  glob: "cordova.js",
                  output: `cordova-${platform}`,
                },
                {
                  input: `.cordova/platforms/${platform}/platform_www`,
                  glob: "cordova_plugins.js",
                  output: `cordova-${platform}`,
                },
                {
                  input: `.cordova/platforms/${platform}/www`,
                  glob: "config.xml",
                  output: `cordova-${platform}`,
                },
              ],
            )
          : []),
      ],
      this._opt.pkgPath,
    );
  }

  async #genServiceWorkerAsync(
    outputFiles: BuildOutputFile[],
    assetFiles: {
      source: string;
      destination: string;
    }[],
  ): Promise<{
    manifest: string;
    assetFiles: {
      source: string;
      destination: string;
    }[];
  }> {
    return await augmentAppWithServiceWorkerEsbuild(
      this._opt.pkgPath,
      this.#swConfFilePath,
      this.#baseHref,
      "index.html",
      outputFiles,
      assetFiles,
    );
  }

  async #getAppContextAsync() {
    const workerEntries = (
      await FsUtils.globAsync(path.resolve(this._opt.pkgPath, "src/workers/*.ts"))
    ).toObject((p) => "workers/" + path.basename(p, path.extname(p)));

    return new SdNgBundlerContext(this._opt.pkgPath, !!this._opt.watch, {
      absWorkingDir: this._opt.pkgPath,
      bundle: true,
      keepNames: true,
      assetNames: "media/[name]",
      conditions: ["es2020", "es2015", "module"],
      resolveExtensions: [".js", ".mjs", ".cjs", ".ts"],
      metafile: true,
      legalComments: this._opt.watch?.dev ? "eof" : "none",
      logLevel: "silent",
      minifyIdentifiers: !this._opt.watch?.dev,
      minifySyntax: !this._opt.watch?.dev,
      minifyWhitespace: !this._opt.watch?.dev,
      pure: ["forwardRef"],
      outdir: this._opt.pkgPath,
      outExtension: undefined,
      sourcemap: !!this._opt.watch?.dev,
      chunkNames: "[name]-[hash]",
      tsconfig: this.#tsConfigFilePath,
      write: false,
      preserveSymlinks: false,
      define: {
        ...(!this._opt.watch?.dev ? { ngDevMode: "false" } : {}),
        "ngJitMode": "false",
        "global": "global",
        "process": "process",
        "Buffer": "Buffer",
        "process.env.SD_VERSION": JSON.stringify(this.#pkgNpmConf.version),
        "process.env.NODE_ENV": JSON.stringify(this._opt.watch?.dev ? "development" : "production"),
        ...(this._conf.env
          ? Object.keys(this._conf.env).toObject(
              (key) => `process.env.${key}`,
              (key) => JSON.stringify(this._conf.env![key]),
            )
          : {}),
      },
      mainFields: ["es2020", "es2015", "browser", "module", "main"],
      entryNames: "[dir]/[name]",
      entryPoints: {
        main: this.#mainFilePath,
        ...(FsUtils.exists(path.resolve(this._opt.pkgPath, "src/polyfills.ts"))
          ? {
              polyfills: path.resolve(this._opt.pkgPath, "src/polyfills.ts"),
            }
          : {}),

        ...(this._conf.builderType === "cordova"
          ? {
              "cordova-entry": path.resolve(
                path.dirname(fileURLToPath(import.meta.url)),
                `../../../lib/cordova-entry.js`,
              ),
            }
          : {}),
        ...workerEntries,
      },
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
      ...(this._conf.builderType === "electron"
        ? {
            platform: "node",
            target: "node20",
            external: [
              "electron",
              ...nodeModule.builtinModules,
              ...(this._conf.builderConfig?.reinstallDependencies ?? []),
            ],
          }
        : {
            platform: "browser",
            target: this.#browserTarget,
            format: "esm",
            splitting: true,
            inject: [
              PathUtils.posix(
                fileURLToPath(import.meta.resolve("node-stdlib-browser/helpers/esbuild/shim")),
              ),
            ],
          }),
      plugins: [
        createSourcemapIgnorelistPlugin(),
        createSdNgPlugin(this._opt, this.#modifiedFileSet, this.#ngResultCache),
        ...(this._conf.builderType === "electron"
          ? []
          : [nodeStdLibBrowserPlugin(nodeStdLibBrowser)]),
        // {
        //   name: "log-circular",
        //   setup(build) {
        //     build.onEnd(result => {
        //       if (result.metafile) {
        //         const analysis = esbuild.analyzeMetafile(result.metafile);
        //         console.log(analysis);
        //       }
        //     });
        //   },
        // },
      ],
    });
  }

  #getStyleContext(): SdNgBundlerContext {
    const pluginFactory = new StylesheetPluginFactory(
      {
        sourcemap: !!this._opt.watch?.dev,
        includePaths: [],
      },
      this.#styleLoadResultCache,
    );

    return new SdNgBundlerContext(this._opt.pkgPath, !!this._opt.watch, {
      absWorkingDir: this._opt.pkgPath,
      bundle: true,
      entryNames: "[name]",
      assetNames: "media/[name]",
      logLevel: "silent",
      minify: !this._opt.watch?.dev,
      metafile: true,
      sourcemap: !!this._opt.watch?.dev,
      outdir: this._opt.pkgPath,
      write: false,
      platform: "browser",
      target: this.#browserTarget,
      preserveSymlinks: false,
      external: [],
      conditions: ["style", "sass"],
      mainFields: ["style", "sass"],
      legalComments: !this._opt.watch?.dev ? "none" : "eof",
      entryPoints: {
        styles: path.resolve(this._opt.pkgPath, "src/styles.scss"),
      },
      plugins: [
        pluginFactory.create(SassStylesheetLanguage),
        pluginFactory.create(CssStylesheetLanguage),
        createCssResourcePlugin(this.#styleLoadResultCache),
      ],
    });
  }

  #getElectronMainContext() {
    return new SdNgBundlerContext(this._opt.pkgPath, !!this._opt.watch, {
      absWorkingDir: this._opt.pkgPath,
      bundle: true,
      entryNames: "[name]",
      assetNames: "media/[name]",
      conditions: ["es2020", "es2015", "module"],
      resolveExtensions: [".js", ".mjs", ".cjs", ".ts"],
      metafile: true,
      legalComments: this._opt.watch?.dev ? "eof" : "none",
      logLevel: "silent",
      minify: !this._opt.watch?.dev,
      outdir: this._opt.pkgPath,
      sourcemap: !!this._opt.watch?.dev,
      tsconfig: this.#tsConfigFilePath,
      write: false,
      preserveSymlinks: false,
      external: ["electron"],
      define: {
        ...(!this._opt.watch?.dev ? { ngDevMode: "false" } : {}),
        "process.env.SD_VERSION": JSON.stringify(this.#pkgNpmConf.version),
        "process.env.NODE_ENV": JSON.stringify(this._opt.watch?.dev ? "development" : "production"),
        ...(this._conf.env
          ? Object.keys(this._conf.env).toObject(
              (key) => `process.env.${key}`,
              (key) => JSON.stringify(this._conf.env![key]),
            )
          : {}),
      },
      platform: "node",
      entryPoints: {
        "electron-main": path.resolve(this._opt.pkgPath, "src/electron-main.ts"),
      },
    });
  }

  #debug(...msg: any[]): void {
    this.#logger.debug(`[${path.basename(this._opt.pkgPath)}]`, ...msg);
  }
}

interface IConf<T extends keyof NonNullable<ISdClientPackageConfig["builder"]>> {
  builderType: T;
  builderConfig: NonNullable<ISdClientPackageConfig["builder"]>[T];
  env: Record<string, string> | undefined;
}
