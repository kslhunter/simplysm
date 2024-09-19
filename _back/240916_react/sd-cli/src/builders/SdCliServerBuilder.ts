import {EventEmitter} from "events";
import {FsUtil, Logger, PathUtil, SdFsWatcher} from "@simplysm/sd-core-node";
import {
  INpmConfig,
  ISdCliBuilderResult,
  ISdCliConfig,
  ISdCliPackageBuildResult,
  ISdCliServerPackageConfig,
  ITsConfig
} from "../commons";
import path from "path";
import {SdLinter} from "../build-tools/SdLinter";
import {FunctionQueue, ObjectUtil, StringUtil} from "@simplysm/sd-core-common";
import {SdServerBundler} from "../build-tools/SdServerBundler";

export class SdCliServerBuilder extends EventEmitter {
  #logger = Logger.get(["simplysm", "sd-cli", "SdCliServerBuilder"]);
  #pkgConf: ISdCliServerPackageConfig;
  #builder?: SdServerBundler;
  #extModules?: { name: string; exists: boolean }[];

  public constructor(private readonly _projConf: ISdCliConfig,
                     private readonly _pkgPath: string) {
    super();
    this.#pkgConf = this._projConf.packages[path.basename(_pkgPath)] as ISdCliServerPackageConfig;
  }

  public override on(event: "change", listener: () => void): this;
  public override on(event: "complete", listener: (result: ISdCliBuilderResult) => void): this;
  public override on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  public async watchAsync(): Promise<void> {
    this.emit("change");

    this._debug("dist 초기화...");
    await FsUtil.removeAsync(path.resolve(this._pkgPath, "dist"));

    this._debug("GEN .config...");
    const confDistPath = path.resolve(this._pkgPath, "dist/.config.json");
    await FsUtil.writeFileAsync(confDistPath, JSON.stringify(this.#pkgConf.configs ?? {}, undefined, 2));

    const result = await this._runAsync({dev: true});
    this.emit("complete", {
      affectedFilePaths: Array.from(result.affectedFileSet),
      buildResults: result.buildResults
    });

    this._debug("WATCH...");
    let changeFiles: string[] = [];
    const fnQ = new FunctionQueue();
    const watcher = SdFsWatcher
      .watch(Array.from(result.watchFileSet))
      .onChange({delay: 100}, (changeInfos) => {
        changeFiles.push(...changeInfos.map((item) => item.path));

        fnQ.runLast(async () => {
          const currChangeFiles = [...changeFiles];
          changeFiles = [];

          this.emit("change");

          this.#builder!.markForChanges(currChangeFiles);

          const watchResult = await this._runAsync({dev: true});
          this.emit("complete", {
            affectedFilePaths: Array.from(watchResult.affectedFileSet),
            buildResults: watchResult.buildResults
          });

          watcher.add(watchResult.watchFileSet);
        });
      });
  }

  public async buildAsync(): Promise<ISdCliBuilderResult> {
    const npmConfig = (await FsUtil.readJsonAsync(path.resolve(this._pkgPath, "package.json"))) as INpmConfig;
    const extModules = await this._getExternalModulesAsync();

    this._debug("dist 초기화...");
    await FsUtil.removeAsync(path.resolve(this._pkgPath, "dist"));

    this._debug("GEN .config.json...");
    const confDistPath = path.resolve(this._pkgPath, "dist/.config.json");
    await FsUtil.writeJsonAsync(confDistPath, this.#pkgConf.configs ?? {}, {space: 2});

    this._debug("GEN package.json...");
    {
      const deps = extModules.filter((item) => item.exists).map((item) => item.name);

      const distNpmConfig = ObjectUtil.clone(npmConfig);
      distNpmConfig.dependencies = {};
      for (const dep of deps) {
        distNpmConfig.dependencies[dep] = "*";
      }
      delete distNpmConfig.optionalDependencies;
      delete distNpmConfig.devDependencies;
      delete distNpmConfig.peerDependencies;

      if (this.#pkgConf.pm2 && !this.#pkgConf.pm2.noStartScript) {
        distNpmConfig.scripts = {"start": "pm2 start pm2.json"};
      }

      await FsUtil.writeJsonAsync(
        path.resolve(this._pkgPath, "dist/package.json"),
        distNpmConfig,
        {space: 2}
      );
    }

    this._debug("GEN openssl.cnf...");
    {
      await FsUtil.writeFileAsync(
        path.resolve(this._pkgPath, "dist/openssl.cnf"),
        `
nodejs_conf = openssl_init

[openssl_init]
providers = provider_sect
ssl_conf = ssl_sect

[provider_sect]
default = default_sect
legacy = legacy_sect

[default_sect]
activate = 1

[legacy_sect]
activate = 1

[ssl_sect]
system_default = system_default_sect

[system_default_sect]
Options = UnsafeLegacyRenegotiation`.trim()
      );
    }


    if (this.#pkgConf.pm2) {
      this._debug("GEN pm2.json...");

      await FsUtil.writeJsonAsync(
        path.resolve(this._pkgPath, "dist/pm2.json"),
        {
          name: this.#pkgConf.pm2.name ?? npmConfig.name.replace(/@/g, "").replace(/\//g, "-"),
          script: "main.js",
          watch: true,
          watch_delay: 2000,
          ignore_watch: [
            "node_modules",
            "www",
            ...this.#pkgConf.pm2.ignoreWatchPaths ?? []
          ],
          ...this.#pkgConf.pm2.noInterpreter ? {} : {
            "interpreter": "node@" + process.versions.node,
          },
          interpreter_args: "--openssl-config=openssl.cnf",
          env: {
            NODE_ENV: "production",
            TZ: "Asia/Seoul",
            SD_VERSION: npmConfig.version,
            ...this.#pkgConf.env
          },
          arrayProcess: "concat",
          useDelTargetNull: true
        }, {
          space: 2
        }
      );
    }

    if (this.#pkgConf.iis) {
      this._debug("GEN web.config...");

      const iisDistPath = path.resolve(this._pkgPath, "dist/web.config");
      const serverExeFilePath = this.#pkgConf.iis.nodeExeFilePath ?? "C:\\Program Files\\nodejs\\node.exe";
      await FsUtil.writeFileAsync(iisDistPath, `
<configuration>
  <appSettings>
    <add key="NODE_ENV" value="production" />
    <add key="TZ" value="Asia/Seoul" />
    <add key="SD_VERSION" value="${npmConfig.version}" />
    ${Object.keys(this.#pkgConf.env ?? {}).map(key => `<add key="${key}" value="${this.#pkgConf.env![key]}"/>`).join("\n    ")}
  </appSettings>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="main.js" verb="*" modules="iisnode" />
    </handlers>
    <iisnode nodeProcessCommandLine="${serverExeFilePath} --openssl-config=openssl.cnf"
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

    const result = await this._runAsync({dev: false});
    return {
      affectedFilePaths: Array.from(result.affectedFileSet),
      buildResults: result.buildResults
    };
  }

  private async _runAsync(opt: { dev: boolean }): Promise<{
    watchFileSet: Set<string>;
    affectedFileSet: Set<string>;
    buildResults: ISdCliPackageBuildResult[];
  }> {
    this._debug(`BUILD 준비...`);
    const tsConfig = FsUtil.readJson(path.resolve(this._pkgPath, "tsconfig.json")) as ITsConfig;
    this.#extModules = this.#extModules ?? await this._getExternalModulesAsync();
    this.#builder = this.#builder ?? new SdServerBundler({
      dev: opt.dev,
      pkgPath: this._pkgPath,
      entryPoints: tsConfig.files ? tsConfig.files.map((item) => path.resolve(this._pkgPath, item)) : [
        path.resolve(this._pkgPath, "src/main.ts")
      ],
      external: this.#extModules.map((item) => item.name)
    });

    this._debug(`BUILD & CHECK...`);
    const buildResult = await this.#builder.bundleAsync();

    //-- filePaths

    const localUpdatePaths = Object.keys(this._projConf.localUpdates ?? {})
      .mapMany((key) => FsUtil.glob(path.resolve(this._pkgPath, "../../node_modules", key)));
    const watchFileSet = new Set(Array.from(buildResult.watchFileSet).filter(item =>
      PathUtil.isChildPath(item, path.resolve(this._pkgPath, "../")) ||
      localUpdatePaths.some((lu) => PathUtil.isChildPath(item, lu))
    ));

    this._debug(`LINT...`);
    const lintResults = await SdLinter.lintAsync(Array.from(buildResult.affectedFileSet).filter(item => PathUtil.isChildPath(item, this._pkgPath)), buildResult.program);

    this._debug(`빌드 완료`);
    return {
      watchFileSet,
      affectedFileSet: buildResult.affectedFileSet,
      buildResults: [...buildResult.results, ...lintResults]
    };
  }

  private async _getExternalModulesAsync(): Promise<{
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

        if (FsUtil.glob(path.resolve(modulePath, "binding.gyp")).length > 0) {
          results.push({
            name: moduleName,
            exists: true
          });
        }

        if (this.#pkgConf.externals?.includes(moduleName)) {
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

        if (FsUtil.glob(path.resolve(optModulePath, "binding.gyp")).length > 0) {
          results.push({
            name: optModuleName,
            exists: true
          });
        }

        if (this.#pkgConf.externals?.includes(optModuleName)) {
          results.push({
            name: optModuleName,
            exists: true
          });
        }

        await fn(optModulePath);
      }
    };

    await fn(this._pkgPath);

    for (const external of this.#pkgConf.externals ?? []) {
      if (!results.some(item => item.name === external)) {
        results.push({
          name: external,
          exists: false
        });
      }
    }

    return results;
  }

  private _debug(msg: string): void {
    this.#logger.debug(`[${path.basename(this._pkgPath)}] ${msg}`);
  }
}
