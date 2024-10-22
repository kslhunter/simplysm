import { EventEmitter } from "events";
import { FsUtil, Logger, PathUtil, SdFsWatcher, TNormPath } from "@simplysm/sd-core-node";
import path from "path";
import { StringUtil } from "@simplysm/sd-core-common";
import { SdServerBundler } from "./SdServerBundler";
import { ISdProjectConfig, ISdServerPackageConfig } from "../../types/sd-configs.type";
import { ISdBuildMessage, ISdBuildRunnerResult } from "../../types/build.type";
import { INpmConfig, ITsConfig } from "../../types/common-configs.type";

export class SdServerBuildRunner extends EventEmitter {
  private _logger = Logger.get(["simplysm", "sd-cli", "SdCliServerBuildRunner"]);
  private _pkgConf: ISdServerPackageConfig;
  private _serverBundler?: SdServerBundler;
  private _extModules?: { name: string; exists: boolean }[];
  private _watchScopePathSet: Set<TNormPath>;

  public constructor(
    private readonly _projConf: ISdProjectConfig,
    private readonly _pkgPath: TNormPath,
  ) {
    super();
    this._pkgConf = this._projConf.packages[path.basename(_pkgPath)] as ISdServerPackageConfig;

    const localUpdatePaths = Object.keys(this._projConf.localUpdates ?? {}).mapMany((key) =>
      FsUtil.glob(path.resolve(this._pkgPath, "../../node_modules", key)),
    );
    this._watchScopePathSet = new Set(
      [path.resolve(this._pkgPath, "../"), ...localUpdatePaths].map((item) => PathUtil.norm(item)),
    );
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
    FsUtil.writeFile(confDistPath, JSON.stringify(this._pkgConf.configs ?? {}, undefined, 2));

    const result = await this._runAsync(true);
    const res: ISdBuildRunnerResult = {
      affectedFilePathSet: result.affectedFileSet,
      buildMessages: result.buildMessages,
      emitFileSet: result.emitFileSet,
    };
    this.emit("complete", res);

    this._debug("WATCH...");
    let lastWatchFileSet = result.watchFileSet;
    SdFsWatcher.watch(Array.from(this._watchScopePathSet)).onChange({ delay: 100 }, async (changeInfos) => {
      const currentChangeInfos = changeInfos.filter((item) => lastWatchFileSet.has(item.path));
      if (currentChangeInfos.length < 1) return;

      this.emit("change");

      const watchResult = await this._runAsync(
        true,
        new Set(currentChangeInfos.map((item) => PathUtil.norm(item.path))),
      );
      const watchRes: ISdBuildRunnerResult = {
        affectedFilePathSet: watchResult.affectedFileSet,
        buildMessages: watchResult.buildMessages,
        emitFileSet: watchResult.emitFileSet,
      };

      this.emit("complete", watchRes);

      lastWatchFileSet = watchResult.watchFileSet;
    });
  }

  public async buildAsync(): Promise<ISdBuildRunnerResult> {
    const projNpmConfig = FsUtil.readJson(path.resolve(process.cwd(), "package.json")) as INpmConfig;
    const npmConfig = FsUtil.readJson(path.resolve(this._pkgPath, "package.json")) as INpmConfig;
    const extModules = await this._getExternalModulesAsync();

    this._debug("dist 초기화...");
    FsUtil.remove(path.resolve(this._pkgPath, "dist"));

    this._debug("GEN .config.json...");
    const confDistPath = path.resolve(this._pkgPath, "dist/.config.json");
    FsUtil.writeJson(confDistPath, this._pkgConf.configs ?? {}, { space: 2 });

    this._debug("GEN package.json...");
    {
      const deps = extModules.filter((item) => item.exists).map((item) => item.name);

      const distNpmConfig: INpmConfig = {
        name: npmConfig.name,
        version: npmConfig.version,
        type: npmConfig.type,
      };
      distNpmConfig.dependencies = {};
      for (const dep of deps) {
        distNpmConfig.dependencies[dep] = "*";
      }

      distNpmConfig.scripts = {};
      if (this._pkgConf.pm2 && !this._pkgConf.pm2.noStartScript) {
        distNpmConfig.scripts["start"] = "pm2 start pm2.config.cjs";
      }

      distNpmConfig.volta = projNpmConfig.volta;

      FsUtil.writeJson(path.resolve(this._pkgPath, "dist/package.json"), distNpmConfig, { space: 2 });
    }

    this._debug("GEN .yarnrc.yml...");
    {
      FsUtil.writeFile(path.resolve(this._pkgPath, "dist/.yarnrc.yml"), "nodeLinker: node-modules");
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

    if (this._pkgConf.pm2) {
      this._debug("GEN pm2.config.cjs...");

      const str = /* language=javascript */ `
        module.exports = {
          apps: [{
            name: "${this._pkgConf.pm2.name ?? npmConfig.name.replace(/@/g, "").replace(/\//g, "-")}",
            script: "main.js",
            watch: true,
            watch_delay: 2000,
            ignore_watch: [
              "node_modules",
              "www",
              ...${JSON.stringify(this._pkgConf.pm2.ignoreWatchPaths ?? [])}
            ],
            ${
              this._pkgConf.pm2.noInterpreter
                ? ""
                : `interpreter: require("child_process").execSync("volta which node").toString().trim()`
            },
            interpreter_args: "--openssl-config=openssl.cnf",
            env: {
              NODE_ENV: "production",
              TZ: "Asia/Seoul",
              SD_VERSION: "${npmConfig.version}",
              ${this._pkgConf.env ? "..." + JSON.stringify(this._pkgConf.env) + "," : ""}
            },
            arrayProcess: "concat",
            useDelTargetNull: true
          }]
        };
      `.replaceAll("\n        ", "\n").trim();

      FsUtil.writeFile(path.resolve(this._pkgPath, "dist/pm2.config.cjs"), str);
    }

    if (this._pkgConf.iis) {
      this._debug("GEN web.config...");

      const iisDistPath = path.resolve(this._pkgPath, "dist/web.config");
      const serverExeFilePath = this._pkgConf.iis.nodeExeFilePath ?? "C:\\Program Files\\nodejs\\node.exe";
      FsUtil.writeFile(
        iisDistPath,
        `
<configuration>
  <appSettings>
    <add key="NODE_ENV" value="production" />
    <add key="TZ" value="Asia/Seoul" />
    <add key="SD_VERSION" value="${npmConfig.version}" />
    ${Object.keys(this._pkgConf.env ?? {})
      .map((key) => `<add key="${key}" value="${this._pkgConf.env![key]}"/>`)
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
    this._extModules = this._extModules ?? (await this._getExternalModulesAsync());
    this._serverBundler =
      this._serverBundler ??
      new SdServerBundler({
        dev,
        pkgPath: this._pkgPath,
        entryPoints: tsConfig.files
          ? tsConfig.files.map((item) => path.resolve(this._pkgPath, item))
          : [path.resolve(this._pkgPath, "src/main.ts")],
        external: this._extModules.map((item) => item.name),
        watchScopePaths: [path.resolve(this._pkgPath, "../"), ...localUpdatePaths].map((item) => PathUtil.norm(item)),
      });

    this._debug(`BUILD...`);
    const bundleResult = await this._serverBundler.bundleAsync(modifiedFileSet);

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

        if (this._pkgConf.externals?.includes(moduleName)) {
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

        if (this._pkgConf.externals?.includes(optModuleName)) {
          results.push({
            name: optModuleName,
            exists: true,
          });
        }

        await fn(optModulePath);
      }
    };

    await fn(this._pkgPath);

    for (const external of this._pkgConf.externals ?? []) {
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
    this._logger.debug(`[${path.basename(this._pkgPath)}] ${msg}`);
  }
}
