import { EventEmitter } from "events";
import { FsUtil, Logger, PathUtil, SdFsWatcher, TNormPath } from "@simplysm/sd-core-node";
import path from "path";
import { ObjectUtil, StringUtil } from "@simplysm/sd-core-common";
import { SdServerBundler } from "./SdServerBundler";
import { ISdProjectConfig, ISdServerPackageConfig } from "../../types/sd-configs.type";
import { ISdBuildMessage, ISdBuildRunnerResult } from "../../types/build.type";
import { INpmConfig, ITsConfig } from "../../types/common-configs.type";

export class SdServerBuildRunner extends EventEmitter {
  #logger = Logger.get(["simplysm", "sd-cli", "SdCliServerBuildRunner"]);
  #pkgConf: ISdServerPackageConfig;
  #serverBundler?: SdServerBundler;
  #extModules?: { name: string; exists: boolean }[];

  public constructor(
    private readonly _projConf: ISdProjectConfig,
    private readonly _pkgPath: TNormPath,
  ) {
    super();
    this.#pkgConf = this._projConf.packages[path.basename(_pkgPath)] as ISdServerPackageConfig;
  }

  public override on(event: "change", listener: () => void): this;
  public override on(event: "complete", listener: (result: ISdBuildRunnerResult) => void): this;
  public override on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  public async watchAsync(): Promise<void> {
    this.emit("change");

    this._debug("dist 초기화...");
    FsUtil.remove(path.resolve(this._pkgPath, "dist"));

    this._debug("GEN .config...");
    const confDistPath = path.resolve(this._pkgPath, "dist/.config.json");
    FsUtil.writeFile(confDistPath, JSON.stringify(this.#pkgConf.configs ?? {}, undefined, 2));

    const result = await this._runAsync(true);
    const res: ISdBuildRunnerResult = {
      affectedFilePathSet: result.affectedFileSet,
      buildMessages: result.buildMessages,
      emitFileSet: result.emitFileSet,
    };
    this.emit("complete", res);

    this._debug("WATCH...");
    const watcher = SdFsWatcher.watch(Array.from(result.watchFileSet)).onChange({ delay: 300 }, async (changeInfos) => {
      this.emit("change");

      const watchResult = await this._runAsync(true, new Set(changeInfos.map((item) => PathUtil.norm(item.path))));
      const watchRes: ISdBuildRunnerResult = {
        affectedFilePathSet: watchResult.affectedFileSet,
        buildMessages: watchResult.buildMessages,
        emitFileSet: watchResult.emitFileSet,
      };

      this.emit("complete", watchRes);

      watcher.replaceWatchPaths(watchResult.watchFileSet);
    });
  }

  public async buildAsync(): Promise<ISdBuildRunnerResult> {
    const npmConfig = FsUtil.readJson(path.resolve(this._pkgPath, "package.json")) as INpmConfig;
    const extModules = await this._getExternalModulesAsync();

    this._debug("dist 초기화...");
    FsUtil.remove(path.resolve(this._pkgPath, "dist"));

    this._debug("GEN .config.json...");
    const confDistPath = path.resolve(this._pkgPath, "dist/.config.json");
    FsUtil.writeJson(confDistPath, this.#pkgConf.configs ?? {}, { space: 2 });

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
        distNpmConfig.scripts = { start: "pm2 start pm2.json" };
      }

      FsUtil.writeJson(path.resolve(this._pkgPath, "dist/package.json"), distNpmConfig, { space: 2 });
    }

    this._debug("GEN openssl.cnf...");
    {
      FsUtil.writeFile(
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
Options = UnsafeLegacyRenegotiation`.trim(),
      );
    }

    if (this.#pkgConf.pm2) {
      this._debug("GEN pm2.json...");

      FsUtil.writeJson(
        path.resolve(this._pkgPath, "dist/pm2.json"),
        {
          name: this.#pkgConf.pm2.name ?? npmConfig.name.replace(/@/g, "").replace(/\//g, "-"),
          script: "main.js",
          watch: true,
          watch_delay: 2000,
          ignore_watch: ["node_modules", "www", ...(this.#pkgConf.pm2.ignoreWatchPaths ?? [])],
          ...(this.#pkgConf.pm2.noInterpreter
            ? {}
            : {
                interpreter: "node@" + process.versions.node,
              }),
          interpreter_args: "--openssl-config=openssl.cnf",
          env: {
            NODE_ENV: "production",
            TZ: "Asia/Seoul",
            SD_VERSION: npmConfig.version,
            ...this.#pkgConf.env,
          },
          arrayProcess: "concat",
          useDelTargetNull: true,
        },
        {
          space: 2,
        },
      );
    }

    if (this.#pkgConf.iis) {
      this._debug("GEN web.config...");

      const iisDistPath = path.resolve(this._pkgPath, "dist/web.config");
      const serverExeFilePath = this.#pkgConf.iis.nodeExeFilePath ?? "C:\\Program Files\\nodejs\\node.exe";
      FsUtil.writeFile(
        iisDistPath,
        `
<configuration>
  <appSettings>
    <add key="NODE_ENV" value="production" />
    <add key="TZ" value="Asia/Seoul" />
    <add key="SD_VERSION" value="${npmConfig.version}" />
    ${Object.keys(this.#pkgConf.env ?? {})
      .map((key) => `<add key="${key}" value="${this.#pkgConf.env![key]}"/>`)
      .join("\n    ")}
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

`.trim(),
      );
    }

    const result = await this._runAsync(false);
    return {
      affectedFilePathSet: result.affectedFileSet,
      buildMessages: result.buildMessages,
      emitFileSet: result.emitFileSet,
    };
  }

  private async _runAsync(
    dev: boolean,
    modifiedFileSet?: Set<TNormPath>,
  ): Promise<{
    watchFileSet: Set<TNormPath>;
    affectedFileSet: Set<TNormPath>;
    buildMessages: ISdBuildMessage[];
    emitFileSet: Set<TNormPath>;
  }> {
    const localUpdatePaths = Object.keys(this._projConf.localUpdates ?? {}).mapMany((key) =>
      FsUtil.glob(path.resolve(this._pkgPath, "../../node_modules", key)),
    );

    this._debug(`BUILD 준비...`);
    const tsConfig = FsUtil.readJson(path.resolve(this._pkgPath, "tsconfig.json")) as ITsConfig;
    this.#extModules = this.#extModules ?? (await this._getExternalModulesAsync());
    this.#serverBundler =
      this.#serverBundler ??
      new SdServerBundler({
        dev,
        pkgPath: this._pkgPath,
        entryPoints: tsConfig.files
          ? tsConfig.files.map((item) => path.resolve(this._pkgPath, item))
          : [path.resolve(this._pkgPath, "src/main.ts")],
        external: this.#extModules.map((item) => item.name),
        watchScopePaths: [path.resolve(this._pkgPath, "../"), ...localUpdatePaths].map((item) => PathUtil.norm(item)),
      });

    this._debug(`BUILD...`);
    const bundleResult = await this.#serverBundler.bundleAsync(modifiedFileSet);

    //-- filePaths
    const watchFileSet = new Set(
      Array.from(bundleResult.watchFileSet).filter(
        (item) =>
          PathUtil.isChildPath(item, path.resolve(this._pkgPath, "../")) ||
          localUpdatePaths.some((lu) => PathUtil.isChildPath(item, lu)),
      ),
    );

    this._debug(`빌드 완료`);
    return {
      watchFileSet,
      affectedFileSet: bundleResult.affectedFileSet,
      buildMessages: bundleResult.results,
      emitFileSet: bundleResult.emitFileSet,
    };
  }

  private async _getExternalModulesAsync(): Promise<
    {
      name: string;
      exists: boolean;
    }[]
  > {
    const loadedModuleNames: string[] = [];
    const results: {
      name: string;
      exists: boolean;
    }[] = [];

    const npmConfigMap = new Map<string, INpmConfig>();

    const fn = async (currPath: string): Promise<void> => {
      const npmConfig = npmConfigMap.getOrCreate(currPath, FsUtil.readJson(path.resolve(currPath, "package.json")));

      const deps = {
        defaults: [
          ...Object.keys(npmConfig.dependencies ?? {}),
          ...Object.keys(npmConfig.peerDependencies ?? {}).filter(
            (item) => !npmConfig.peerDependenciesMeta?.[item]?.optional,
          ),
        ].distinct(),
        optionals: [
          ...Object.keys(npmConfig.optionalDependencies ?? {}),
          ...Object.keys(npmConfig.peerDependencies ?? {}).filter(
            (item) => npmConfig.peerDependenciesMeta?.[item]?.optional,
          ),
        ].distinct(),
      };

      for (const moduleName of deps.defaults) {
        if (loadedModuleNames.includes(moduleName)) continue;
        loadedModuleNames.push(moduleName);

        const modulePath = FsUtil.findAllParentChildPaths(
          "node_modules/" + moduleName,
          currPath,
          path.resolve(this._pkgPath, "../../"),
        ).first();
        if (StringUtil.isNullOrEmpty(modulePath)) {
          continue;
        }

        if (FsUtil.glob(path.resolve(modulePath, "binding.gyp")).length > 0) {
          results.push({
            name: moduleName,
            exists: true,
          });
        }

        if (this.#pkgConf.externals?.includes(moduleName)) {
          results.push({
            name: moduleName,
            exists: true,
          });
        }

        await fn(modulePath);
      }

      for (const optModuleName of deps.optionals) {
        if (loadedModuleNames.includes(optModuleName)) continue;
        loadedModuleNames.push(optModuleName);

        const optModulePath = FsUtil.findAllParentChildPaths(
          "node_modules/" + optModuleName,
          currPath,
          path.resolve(this._pkgPath, "../../"),
        ).first();
        if (StringUtil.isNullOrEmpty(optModulePath)) {
          results.push({
            name: optModuleName,
            exists: false,
          });
          continue;
        }

        if (FsUtil.glob(path.resolve(optModulePath, "binding.gyp")).length > 0) {
          results.push({
            name: optModuleName,
            exists: true,
          });
        }

        if (this.#pkgConf.externals?.includes(optModuleName)) {
          results.push({
            name: optModuleName,
            exists: true,
          });
        }

        await fn(optModulePath);
      }
    };

    await fn(this._pkgPath);

    for (const external of this.#pkgConf.externals ?? []) {
      if (!results.some((item) => item.name === external)) {
        results.push({
          name: external,
          exists: false,
        });
      }
    }

    return results;
  }

  private _debug(msg: string): void {
    this.#logger.debug(`[${path.basename(this._pkgPath)}] ${msg}`);
  }
}
