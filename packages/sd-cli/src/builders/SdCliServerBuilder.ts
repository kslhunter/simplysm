import {EventEmitter} from "events";
import {FsUtil, Logger, SdFsWatcher} from "@simplysm/sd-core-node";
import {INpmConfig, ISdCliBuilderResult, ISdCliConfig, ISdCliServerPackageConfig} from "../commons";
import path from "path";
import {SdTsCompiler} from "../build-tools/SdTsCompiler";
import {SdLinter} from "../build-tools/SdLinter";
import {FunctionQueue, ObjectUtil} from "@simplysm/sd-core-common";
import {SdTsBundler} from "../build-tools/SdTsBundler";

export class SdCliServerBuilder extends EventEmitter {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", "SdCliServerBuilder"]);
  private readonly _pkgConf: ISdCliServerPackageConfig;

  public constructor(private readonly _projConf: ISdCliConfig,
                     private readonly _pkgPath: string,
                     private readonly _withLint: boolean) {
    super();
    this._pkgConf = this._projConf.packages[path.basename(_pkgPath)] as ISdCliServerPackageConfig;
  }

  public override on(event: "change", listener: () => void): this;
  public override on(event: "complete", listener: (result: ISdCliBuilderResult) => void): this;
  public override on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  public async watchAsync(): Promise<void> {
    // const extModules = await this._getExternalModulesAsync();

    this._debug("dist 초기화...");
    await FsUtil.removeAsync(path.resolve(this._pkgPath, "dist"));

    this._debug("GEN .config...");
    const confDistPath = path.resolve(this._pkgPath, "dist/.config.json");
    await FsUtil.writeFileAsync(confDistPath, JSON.stringify(this._pkgConf.configs ?? {}, undefined, 2));

    this._debug(`BUILD 준비...`);
    const builder = new SdTsBundler({
      dev: false,
      pkgPath: this._pkgPath,
      entryPoints: [
        path.resolve(this._pkgPath, "src/main.ts")
      ],
      // external: extModules.map((item) => item.name)
    });

    const checker = new SdTsCompiler({
      pkgPath: this._pkgPath,
      emit: false,
      emitDts: false,
      globalStyle: false
    });

    this._debug("WATCH...");
    const fnQ = new FunctionQueue();
    SdFsWatcher
      .watch([
        path.resolve(this._pkgPath, "src/**/*.*")
      ], {
        ignoreInitial: false
      })
      .onChange({
        delay: 100
      }, () => {
        fnQ.runLast(async () => {
          this.emit("change");

          this._debug(`BUILD...`);
          const buildResults = await builder.bundleAsync();

          this._debug("CHECK...");
          const checkResult = await checker.buildAsync();

          this._debug(`LINT...`);
          const lintResults = !this._withLint ? [] : await SdLinter.lintAsync(checkResult.affectedFilePaths, checker.program);

          this._debug(`빌드 완료`);
          this.emit("complete", {
            affectedFilePaths: checkResult.affectedFilePaths,
            buildResults: [...buildResults, ...checkResult.results, ...lintResults]
          });
        });
      });
  }

  public async buildAsync(): Promise<ISdCliBuilderResult> {
    const npmConfig = (await FsUtil.readJsonAsync(path.resolve(this._pkgPath, "package.json"))) as INpmConfig;
    // const extModules = await this._getExternalModulesAsync();

    this._debug("dist 초기화...");
    await FsUtil.removeAsync(path.resolve(this._pkgPath, "dist"));

    this._debug("GEN .config.json...");
    const confDistPath = path.resolve(this._pkgPath, "dist/.config.json");
    await FsUtil.writeFileAsync(confDistPath, JSON.stringify(this._pkgConf.configs ?? {}, undefined, 2));

    this._debug("GEN package.json...");
    {
      // const deps = extModules.filter((item) => item.exists).map((item) => item.name);

      const distNpmConfig = ObjectUtil.clone(npmConfig);
      // distNpmConfig.dependencies = {};
      // for (const dep of deps) {
      //   distNpmConfig.dependencies[dep] = "*";
      // }
      delete distNpmConfig.optionalDependencies;
      delete distNpmConfig.devDependencies;
      delete distNpmConfig.peerDependencies;

      if (this._pkgConf.pm2 && !this._pkgConf.pm2.noStartScript) {
        distNpmConfig.scripts = {"start": "pm2 start pm2.json"};
      }

      await FsUtil.writeFileAsync(
        path.resolve(this._pkgPath, "dist/package.json"),
        JSON.stringify(distNpmConfig, undefined, 2)
      );
    }

    if (this._pkgConf.pm2) {
      this._debug("GEN pm2.json...");

      await FsUtil.writeFileAsync(
        path.resolve(this._pkgPath, "dist/pm2.json"),
        JSON.stringify({
          name: npmConfig.name.replace(/@/g, "").replace(/\//g, "-"),
          script: "main.js",
          watch: true,
          watch_delay: 2000,
          ignore_watch: [
            "node_modules",
            "www",
            ...this._pkgConf.pm2.ignoreWatchPaths ?? []
          ],
          ...this._pkgConf.pm2.noInterpreter ? {} : {
            "interpreter": "node@" + process.versions.node,
          },
          "env": {
            NODE_ENV: "production",
            TZ: "Asia/Seoul",
            SD_VERSION: npmConfig.version,
            ...this._pkgConf.env
          },
          arrayProcess: "concat",
          useDelTargetNull: true
        }, undefined, 2)
      );
    }

    if (this._pkgConf.iis) {
      this._debug("GEN web.config...");

      const iisDistPath = path.resolve(this._pkgPath, "dist/web.config");
      const serverExeFilePath = this._pkgConf.iis.nodeExeFilePath ?? "C:\\Program Files\\nodejs\\node.exe";
      await FsUtil.writeFileAsync(iisDistPath, `
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="main.js" verb="*" modules="iisnode" />
    </handlers>
    <iisnode nodeProcessCommandLine="${serverExeFilePath}"
             watchedFiles="web.config;*.js"
             loggingEnabled="true"
             devErrorsEnabled="true" />
    <rewrite>
      <rules>
        <rule name="main">
          <action type="Rewrite" url="main.js" />
        </rule>
      </rules>
    </rewrite>
    <httpErrors errorMode="Detailed" />
  </system.webServer>
</configuration>

`.trim());
    }

    this._debug(`BUILD 준비...`);
    const builder = new SdTsBundler({
      dev: true,
      pkgPath: this._pkgPath,
      entryPoints: [
        path.resolve(this._pkgPath, "src/main.ts")
      ],
      // external: extModules.map((item) => item.name)
    });

    const checker = new SdTsCompiler({
      pkgPath: this._pkgPath,
      emit: false,
      emitDts: false,
      globalStyle: false
    });

    this._debug(`BUILD...`);
    const buildResults = await builder.bundleAsync();

    this._debug("CHECK...");
    const checkResult = await checker.buildAsync();

    this._debug(`LINT...`);
    const lintResults = !this._withLint ? [] : await SdLinter.lintAsync(checkResult.affectedFilePaths, checker.program);

    this._debug(`빌드 완료`);
    return {
      affectedFilePaths: checkResult.affectedFilePaths,
      buildResults: [...buildResults, ...checkResult.results, ...lintResults]
    };
  }

  /*private async _getExternalModulesAsync(): Promise<{
    name: string;
    exists: boolean
  }[]> {
    const loadedModuleNames: string[] = [];
    const results: {
      name: string;
      exists: boolean
    }[] = [];

    const npmConfigMap = new Map<string, INpmConfig>();

    const fn = async (currPath: string): Promise<void> => {
      const npmConfig = npmConfigMap.getOrCreate(currPath, await FsUtil.readJsonAsync(path.resolve(currPath, "package.json")));

      const deps = {
        defaults: [
          ...Object.keys(npmConfig.dependencies ?? {}),
          ...Object.keys(npmConfig.peerDependencies ?? {}).filter((item) => !npmConfig.peerDependenciesMeta?.[item]?.optional)
        ].distinct(),
        optionals: [
          ...Object.keys(npmConfig.optionalDependencies ?? {}),
          ...Object.keys(npmConfig.peerDependencies ?? {}).filter((item) => npmConfig.peerDependenciesMeta?.[item]?.optional)
        ].distinct()
      };

      for (const moduleName of deps.defaults) {
        if (loadedModuleNames.includes(moduleName)) continue;
        loadedModuleNames.push(moduleName);

        const modulePath = FsUtil.findAllParentChildPaths("node_modules/" + moduleName, currPath, path.resolve(this._pkgPath, "../../")).first();
        if (StringUtil.isNullOrEmpty(modulePath)) {
          continue;
        }

        if (FsUtil.glob(path.resolve(modulePath, "**!/binding.gyp")).length > 0) {
          results.push({
            name: moduleName,
            exists: true
          });
        }

        if (this._pkgConf.externals?.includes(moduleName)) {
          results.push({
            name: moduleName,
            exists: true
          });
        }

        await fn(modulePath);
      }

      for (const optModuleName of deps.optionals) {
        if (loadedModuleNames.includes(optModuleName)) continue;
        loadedModuleNames.push(optModuleName);

        const optModulePath = FsUtil.findAllParentChildPaths("node_modules/" + optModuleName, currPath, path.resolve(this._pkgPath, "../../")).first();
        if (StringUtil.isNullOrEmpty(optModulePath)) {
          results.push({
            name: optModuleName,
            exists: false
          });
          continue;
        }

        if (FsUtil.glob(path.resolve(optModulePath, "**!/binding.gyp")).length > 0) {
          results.push({
            name: optModuleName,
            exists: true
          });
        }

        if (this._pkgConf.externals?.includes(optModuleName)) {
          results.push({
            name: optModuleName,
            exists: true
          });
        }

        await fn(optModulePath);
      }
    };

    await fn(this._pkgPath);

    return results;
  }*/

  private _debug(msg: string): void {
    this._logger.debug(`[${path.basename(this._pkgPath)}] ${msg}`);
  }
}