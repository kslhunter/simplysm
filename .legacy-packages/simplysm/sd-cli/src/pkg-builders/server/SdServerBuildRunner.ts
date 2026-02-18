import type { TNormPath } from "@simplysm/sd-core-node";
import { FsUtils, SdLogger } from "@simplysm/sd-core-node";
import path from "path";
import { javascript, StringUtils } from "@simplysm/sd-core-common";
import { SdBuildRunnerBase } from "../SdBuildRunnerBase";
import { SdServerBundler } from "./SdServerBundler";
import type { ISdBuildResult } from "../../types/build/ISdBuildResult";
import type { INpmConfig } from "../../types/common-config/INpmConfig";

export class SdServerBuildRunner extends SdBuildRunnerBase<"server"> {
  protected override _logger = SdLogger.get(["simplysm", "sd-cli", "SdServerBuildRunner"]);

  private _serverBundler?: SdServerBundler;

  protected override async _runAsync(modifiedFileSet?: Set<TNormPath>): Promise<ISdBuildResult> {
    // 최초
    if (!modifiedFileSet) {
      const externalModules = this._getExternalModules();

      if (!this._opt.watch?.dev) {
        this._generateProductionFiles(
          externalModules.filter((item) => item.exists).map((item) => item.name),
        );
      }

      if (!this._opt.watch?.noEmit) {
        this._debug("GEN .config...");
        const confDistPath = path.resolve(this._opt.pkgPath, "dist/.config.json");
        FsUtils.writeFile(confDistPath, JSON.stringify(this._pkgConf.configs ?? {}, undefined, 2));
      }

      this._debug(`BUILD 준비...`);
      this._serverBundler = new SdServerBundler(this._opt, {
        external: externalModules.map((item) => item.name),
      });
    }

    this._debug(`BUILD...`);
    const bundleResult = await this._serverBundler!.bundleAsync(modifiedFileSet);

    this._debug(`빌드 완료`);
    return bundleResult;
  }

  private _generateProductionFiles(externals: string[]) {
    const npmConf = FsUtils.readJson(path.resolve(this._opt.pkgPath, "package.json")) as INpmConfig;

    this._debug("GEN package.json...");
    {
      const projNpmConf = FsUtils.readJson(
        path.resolve(process.cwd(), "package.json"),
      ) as INpmConfig;

      const distNpmConfig: INpmConfig = {
        name: npmConf.name,
        version: npmConf.version,
        type: npmConf.type,
      };
      distNpmConfig.dependencies = {};
      for (const external of externals) {
        distNpmConfig.dependencies[external] = "*";
      }

      distNpmConfig.volta = projNpmConf.volta;

      FsUtils.writeJson(path.resolve(this._opt.pkgPath, "dist/package.json"), distNpmConfig, {
        space: 2,
      });
    }

    this._debug("GEN .yarnrc.yml...");
    {
      FsUtils.writeFile(
        path.resolve(this._opt.pkgPath, "dist/.yarnrc.yml"),
        "nodeLinker: node-modules",
      );
    }

    this._debug("GEN openssl.cnf...");
    {
      FsUtils.writeFile(
        path.resolve(this._opt.pkgPath, "dist/openssl.cnf"),
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
          useDelTargetNull: true
        };`
        .replace(/\n {8}/g, "\n")
        .trim();

      FsUtils.writeFile(path.resolve(this._opt.pkgPath, "dist/pm2.config.cjs"), str);
    }

    if (this._pkgConf.iis) {
      this._debug("GEN web.config...");

      const iisDistPath = path.resolve(this._opt.pkgPath, "dist/web.config");
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

  private _getExternalModules(): {
    name: string;
    exists: boolean;
  }[] {
    const loadedModuleNames: string[] = [];
    const results: {
      name: string;
      exists: boolean;
    }[] = [];

    const npmConfigMap = new Map<string, INpmConfig>();

    const fn = (currPath: string) => {
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
          path.resolve(this._opt.pkgPath, "../../"),
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

        fn(modulePath);
      }

      for (const optModuleName of deps.optionals) {
        if (loadedModuleNames.includes(optModuleName)) continue;
        loadedModuleNames.push(optModuleName);

        const optModulePath = FsUtils.findAllParentChildPaths(
          "node_modules/" + optModuleName,
          currPath,
          path.resolve(this._opt.pkgPath, "../../"),
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

        fn(optModulePath);
      }
    };

    fn(this._opt.pkgPath);

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
