import { FsUtils, SdLogger, TNormPath } from "@simplysm/sd-core-node";
import path from "path";
import { javascript, StringUtils } from "@simplysm/sd-core-common";
import { SdServerBundler } from "./sd-server.bundler";
import { INpmConfig, ITsConfig } from "../../types/common-configs.types";
import { BuildRunnerBase, IBuildRunnerRunResult } from "../commons/build-runner.base";

export class SdServerBuildRunner extends BuildRunnerBase<"server"> {
  protected override _logger = SdLogger.get(["simplysm", "sd-cli", "SdCliServerBuildRunner"]);

  #serverBundler?: SdServerBundler;
  #extModules?: { name: string; exists: boolean }[];

  protected override async _runAsync(
    dev: boolean,
    modifiedFileSet?: Set<TNormPath>,
  ): Promise<IBuildRunnerRunResult> {
    if (!dev) {
      await this.#generateProductionFilesAsync();
    }

    if (!modifiedFileSet) {
      this._debug("GEN .config...");
      const confDistPath = path.resolve(this._pkgPath, "dist/.config.json");
      FsUtils.writeFile(confDistPath, JSON.stringify(this._pkgConf.configs ?? {}, undefined, 2));
    }

    /*const localUpdatePaths = Object.keys(this._projConf.localUpdates ?? {}).mapMany((key) =>
      FsUtils.glob(path.resolve(this._pkgPath, "../../node_modules", key)),
    );*/

    this._debug(`BUILD 준비...`);
    const tsConfig = FsUtils.readJson(path.resolve(this._pkgPath, "tsconfig.json")) as ITsConfig;
    this.#extModules = this.#extModules ?? (await this.#getExternalModulesAsync());
    this.#serverBundler =
      this.#serverBundler ??
      new SdServerBundler({
        dev,
        pkgPath: this._pkgPath,
        entryPoints: tsConfig.files
          ? tsConfig.files.map((item) => path.resolve(this._pkgPath, item))
          : [
              path.resolve(this._pkgPath, "dist/main.ts"),
              ...FsUtils.glob(path.resolve(this._pkgPath, "dist/workers/*.ts")),
            ],
        external: this.#extModules.map((item) => item.name),
        watchScopePathSet: this._watchScopePathSet,
      });

    this._debug(`BUILD...`);
    const bundleResult = await this.#serverBundler.bundleAsync(modifiedFileSet);

    //-- filePaths
    const watchFileSet = new Set(
      Array.from(bundleResult.watchFileSet).filter((item) => this._watchScopePathSet.inScope(item)),
    );

    this._debug(`빌드 완료`);
    return {
      watchFileSet,
      affectedFileSet: bundleResult.affectedFileSet,
      buildMessages: bundleResult.results,
      emitFileSet: bundleResult.emitFileSet,
    };
  }

  async #generateProductionFilesAsync() {
    const npmConf = FsUtils.readJson(path.resolve(this._pkgPath, "package.json")) as INpmConfig;

    this._debug("GEN package.json...");
    {
      const projNpmConf = FsUtils.readJson(
        path.resolve(process.cwd(), "package.json"),
      ) as INpmConfig;
      const extModules = await this.#getExternalModulesAsync();

      const deps = extModules.filter((item) => item.exists).map((item) => item.name);

      const distNpmConfig: INpmConfig = {
        name: npmConf.name,
        version: npmConf.version,
        type: npmConf.type,
      };
      distNpmConfig.dependencies = {};
      for (const dep of deps) {
        distNpmConfig.dependencies[dep] = "*";
      }

      // distNpmConfig.scripts = {};
      // if (this._pkgConf.pm2 && !this._pkgConf.pm2.noStartScript) {
      //   distNpmConfig.scripts["start"] = "pm2 start pm2.config.cjs";
      //   distNpmConfig.scripts["stop"] = "pm2 stop pm2.config.cjs";
      //   distNpmConfig.scripts["delete"] = "pm2 delete pm2.config.cjs";
      // }

      distNpmConfig.volta = projNpmConf.volta;

      FsUtils.writeJson(path.resolve(this._pkgPath, "dist/package.json"), distNpmConfig, {
        space: 2,
      });
    }

    this._debug("GEN .yarnrc.yml...");
    {
      FsUtils.writeFile(
        path.resolve(this._pkgPath, "dist/.yarnrc.yml"),
        "nodeLinker: node-modules",
      );
    }

    this._debug("GEN openssl.cnf...");
    {
      FsUtils.writeFile(
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

      const str = javascript`
        const cp = require("child_process");

        const npmConf = require("./package.json");

        const pm2Conf = ${JSON.stringify(this._pkgConf.pm2)};
        const env = ${JSON.stringify(this._pkgConf.env)};

        module.exports = {
          name: pm2Conf.name ?? npmConf.name.replace(/@/g, "").replace(/[\\\/]/g, "-"),
          script: "main.js",
          watch: true,
          watch_delay: 2000,
          ignore_watch: [
            "node_modules",
            "www",
            ...pm2Conf.ignoreWatchPaths ?? [],
          ],
          ...pm2Conf.noInterpreter ? {} : { interpreter: cp.execSync("volta which node").toString().trim() },
          interpreter_args: "--openssl-config=openssl.cnf",
          env: {
            NODE_ENV: "production",
            TZ: "Asia/Seoul",
            SD_VERSION: npmConf.version,
            ...env ?? {},
          },
          arrayProcess: "concat",
          useDelTargetNull: true,
          exec_mode: pm2Conf.instances != null ? "cluster" : "fork",
          instances: pm2Conf.instances ?? 1,
        };`
        .replaceAll("\n        ", "\n")
        .trim();

      FsUtils.writeFile(path.resolve(this._pkgPath, "dist/pm2.config.cjs"), str);
    }

    if (this._pkgConf.iis) {
      this._debug("GEN web.config...");

      const iisDistPath = path.resolve(this._pkgPath, "dist/web.config");
      const nodeVersion = process.versions.node.substring(1);
      const serverExeFilePath =
        this._pkgConf.iis.nodeExeFilePath ??
        `%HOMEDRIVE%%HOMEPATH%\\AppData\\Local\\Volta\\tools\\image\\node\\${nodeVersion}\\node.exe`;

      FsUtils.writeFile(
        iisDistPath,
        `
<configuration>
  <appSettings>
    <add key="NODE_ENV" value="production" />
    <add key="TZ" value="Asia/Seoul" />
    <add key="SD_VERSION" value="${npmConf.version}" />
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
</configuration>`.trim(),
      );
    }
  }

  async #getExternalModulesAsync(): Promise<
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
      const npmConfig = npmConfigMap.getOrCreate(
        currPath,
        FsUtils.readJson(path.resolve(currPath, "package.json")),
      );

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
            (item) => npmConfig.peerDependenciesMeta?.[item]?.optional ?? false,
          ),
        ].distinct(),
      };

      for (const moduleName of deps.defaults) {
        if (loadedModuleNames.includes(moduleName)) continue;
        loadedModuleNames.push(moduleName);

        const modulePath = FsUtils.findAllParentChildPaths(
          "node_modules/" + moduleName,
          currPath,
          path.resolve(this._pkgPath, "../../"),
        ).first();
        if (StringUtils.isNullOrEmpty(modulePath)) {
          continue;
        }

        if (FsUtils.glob(path.resolve(modulePath, "binding.gyp")).length > 0) {
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

        const optModulePath = FsUtils.findAllParentChildPaths(
          "node_modules/" + optModuleName,
          currPath,
          path.resolve(this._pkgPath, "../../"),
        ).first();
        if (StringUtils.isNullOrEmpty(optModulePath)) {
          results.push({
            name: optModuleName,
            exists: false,
          });
          continue;
        }

        if (FsUtils.glob(path.resolve(optModulePath, "binding.gyp")).length > 0) {
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
}
