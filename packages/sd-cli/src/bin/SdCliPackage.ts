import {FsUtils, Logger, ProcessManager, ProcessWorkManager} from "@simplysm/sd-core-node";
import {INpmConfig, ISdAndroidPackageConfig, ISdPackageInfo, TSdPackageConfig} from "../commons";
import * as path from "path";
import * as ts from "typescript";
import {ISdPackageBuildResult, SdPackageBuilder} from "../build-tools/SdPackageBuilder";
import {EventEmitter} from "events";
import {NeverEntryError, ObjectUtils, SdError} from "@simplysm/sd-core-common";
import {NextHandleFunction} from "connect";
import {SdServiceClient} from "@simplysm/sd-service-node";

export class SdCliPackage extends EventEmitter {
  public get name(): string {
    return this.info.npmConfig.name;
  }

  public get dependencies(): string[] {
    return [
      ...Object.keys(this.info.npmConfig.dependencies ?? {}),
      ...Object.keys(this.info.npmConfig.devDependencies ?? {}),
      ...Object.keys(this.info.npmConfig.peerDependencies ?? {})
    ];
  }

  public get entryFilePath(): string | undefined {
    if (this.info.npmConfig.main === undefined) return undefined;
    return path.resolve(this.info.rootPath, this.info.npmConfig.main);
  }

  public get isAngular(): boolean {
    return this.info.npmConfig.dependencies !== undefined &&
      Object.keys(this.info.npmConfig.dependencies).includes("@angular/core");
  }

  public static async createAsync(rootPath: string, npmConfig: INpmConfig, npmConfigPath: string, config: TSdPackageConfig | undefined, devMode: boolean): Promise<SdCliPackage> {
    const info: Partial<ISdPackageInfo> = {rootPath};

    const tsConfigPath = path.resolve(rootPath, "tsconfig.json");
    if (FsUtils.exists(tsConfigPath)) {
      const tsConfig = await FsUtils.readJsonAsync(tsConfigPath);

      info.tsConfig = {
        filePath: tsConfigPath,
        config: tsConfig
      };

      if (config) {
        let targets: ("browser" | "node")[] | undefined;
        if (config.type === "library") {
          targets = config.targets;
        }
        else if (config.type === "server") {
          targets = ["node"];
        }
        else {
          targets = ["browser"];
        }

        if (targets) {
          await targets.parallelAsync(async target => {
            const tsConfigForBuildPath = path.resolve(rootPath, `tsconfig-${target}.build.json`);

            info.tsConfigForBuild = info.tsConfigForBuild ?? {};
            info.tsConfigForBuild[target] = {
              filePath: tsConfigForBuildPath
            };

            if (FsUtils.exists(tsConfigForBuildPath)) {
              info.tsConfigForBuild[target]!.config = await FsUtils.readJsonAsync(tsConfigForBuildPath);
            }
          });
        }
      }
    }

    info.npmConfig = npmConfig;
    info.npmConfigPath = npmConfigPath;
    info.config = config;

    const logger = Logger.get(["simplysm", "sd-cli", "package", info.npmConfig.name]);

    return new SdCliPackage(info as ISdPackageInfo, devMode, logger);
  }

  private constructor(public readonly info: ISdPackageInfo,
                      private readonly _devMode: boolean,
                      private readonly _logger: Logger) {
    super();
  }

  public on(event: "change", listener: (arg: { packageName: string; command: string; target?: string; filePaths?: string[] }) => void): this;
  public on(event: "complete", listener: (arg: { packageName: string; command: string; target?: string; results: ISdPackageBuildResult[] }) => void): this;
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public async updateVersionAsync(version: string, dependencyNames: string[]): Promise<void> {
    this.info.npmConfig.version = version;

    const fn = (currDeps: { [key: string]: string | undefined } | undefined): void => {
      if (currDeps) {
        for (const dependencyName of dependencyNames) {
          if (currDeps[dependencyName] !== undefined) {
            currDeps[dependencyName] = version;
          }
        }
      }
    };

    fn(this.info.npmConfig.dependencies);
    fn(this.info.npmConfig.devDependencies);
    fn(this.info.npmConfig.peerDependencies);

    await FsUtils.writeJsonAsync(this.info.npmConfigPath, this.info.npmConfig, {space: 2});
  }

  public async createTsBuildConfigAsync(): Promise<void> {
    // if (!this._info.config) return;
    if (!this.info.tsConfigForBuild) return;

    const targets: ("node" | "browser")[] = Object.keys(this.info.tsConfigForBuild) as ("node" | "browser")[];

    if (!this.info.tsConfig) return;
    if (!this.info.tsConfigForBuild) return;
    const parsedTsConfig = ts.parseJsonConfigFileContent(this.info.tsConfig.config, ts.sys, this.info.rootPath);

    await targets.parallelAsync(async target => {
      if (!this.info.tsConfig) throw new NeverEntryError();
      if (!this.info.tsConfigForBuild) throw new NeverEntryError();
      if (!this.info.tsConfigForBuild[target]) return;

      const config = ObjectUtils.clone(this.info.tsConfig.config);
      const options = config.compilerOptions;

      delete options.baseUrl;
      delete options.paths;

      options.target = target === "browser" ? "es5" : "es2017";

      if (targets.length > 1 && target !== "node") {

        const defaultDistPath = parsedTsConfig.options.outDir !== undefined ?
          path.resolve(parsedTsConfig.options.outDir) :
          path.resolve(this.info.rootPath, "dist");

        options.outDir = path.relative(this.info.rootPath, defaultDistPath) + "-" + target;
        options.declaration = false;
      }

      await FsUtils.writeJsonAsync(this.info.tsConfigForBuild[target]!.filePath, config, {space: 2});

      this.info.tsConfigForBuild[target]!.config = config;
    });
  }

  public async removeDistPathAsync(): Promise<void> {
    const targets = this.info.tsConfigForBuild ? Object.keys(this.info.tsConfigForBuild) : undefined;
    if (!targets) return;

    await targets.parallelAsync(async target => {
      const parsedTsConfig = ts.parseJsonConfigFileContent(this.info.tsConfigForBuild![target].config, ts.sys, this.info.rootPath);

      const distPath = parsedTsConfig.options.outDir !== undefined ?
        path.resolve(parsedTsConfig.options.outDir) :
        path.resolve(this.info.rootPath, "dist");

      await FsUtils.removeAsync(distPath);
    });
  }

  public async genIndexAsync(watch: boolean, processManager: ProcessWorkManager): Promise<void> {
    if (this.info.config?.type === undefined || this.info.config.type === "none") return;

    if (this.info.config?.type !== "library") return;
    if (this.info.npmConfig?.main === undefined) return;

    const target = this.info.tsConfigForBuild ? Object.keys(this.info.tsConfigForBuild)[0] : undefined;
    if (target === undefined) return;

    await this._runAsync(watch, processManager, "gen-index", target);
  }

  public async lintAsync(watch: boolean, processManager: ProcessWorkManager): Promise<void> {
    // if (this.info.config?.type === undefined || this.info.config.type === "none") return;

    const targets = this.info.tsConfigForBuild ? Object.keys(this.info.tsConfigForBuild) : undefined;
    const target = targets === undefined ? undefined :
      targets.length === 1 ? targets[0] :
        targets.single(item => item === "node");

    await this._runAsync(watch, processManager, "lint", target);
  }

  public async checkAsync(watch: boolean, processManager: ProcessWorkManager): Promise<void> {
    if (this.info.config?.type === undefined || this.info.config.type === "none") return;

    const targets = this.info.tsConfigForBuild ? Object.keys(this.info.tsConfigForBuild) : undefined;
    if (!targets) return;

    await targets.parallelAsync(async target => {
      await this._runAsync(watch, processManager, "check", target);
    });
  }

  public async compileAsync(watch: boolean, processManager: ProcessWorkManager): Promise<void | NextHandleFunction[]> {
    if (this.info.config?.type === undefined || this.info.config.type === "none") return;

    if (this.info.config?.type === "library") {
      const targets = this.info.tsConfigForBuild ? Object.keys(this.info.tsConfigForBuild) : undefined;
      if (!targets) return;

      await targets.parallelAsync(async target => {
        await this._runAsync(watch, processManager, "compile", target);
      });
    }
    else if (this.info.config?.type === "server") {
      await this._runAsync(watch, processManager, "compile", "node");
    }
    else {
      if (watch) {
        const command = "compile";
        const target = "browser";

        return await new SdPackageBuilder(this.info, command, target, this._devMode)
          .on("change", filePaths => {
            this.emit("change", {packageName: this.name, command, target, filePaths});
          })
          .on("complete", results => {
            this.emit("complete", {packageName: this.name, command, target, results});
          })
          .runClientCompileAsync(watch);
      }
      else {
        await this._runAsync(watch, processManager, "compile", "browser");
      }
    }
  }

  public async genNgAsync(watch: boolean, processManager: ProcessWorkManager): Promise<void> {
    if (this.info.config?.type === undefined || this.info.config.type === "none") return;

    if (!this.isAngular) return;

    const targets = this.info.tsConfigForBuild ? Object.keys(this.info.tsConfigForBuild) : undefined;
    if (!targets) return;

    await targets.filter(item => item === "browser").parallelAsync(async target => {
      await this._runAsync(watch, processManager, "gen-ng", target);
    });
  }

  public async publishAsync(): Promise<void> {
    if (this.info.config?.type === undefined || this.info.config.type === "none") return;

    if (this.info.config?.type === "library" && this.info.config.publish === "npm") {
      await ProcessManager.spawnAsync(
        "yarn publish --access public",
        {cwd: this.info.rootPath},
        false,
        false
      );
    }
    else if (this.info.config?.type !== "library" && this.info.config.publish !== undefined && this.info.config.publish.type === "simplysm") {
      const publishConfig = this.info.config.publish;

      const wsClient = new SdServiceClient(
        publishConfig.port ?? (publishConfig.ssl ? 443 : 80),
        publishConfig.host,
        publishConfig.ssl
      );
      await wsClient.connectAsync();

      // 결과 파일 업로드

      const targets = this.info.tsConfigForBuild ? Object.keys(this.info.tsConfigForBuild) : undefined;
      if (!targets) return;

      const fileInfos: { [key: string]: { total: number; current: number } } = {};
      await targets.parallelAsync(async target => {
        const parsedTsConfig = ts.parseJsonConfigFileContent(this.info.tsConfigForBuild![target].config, ts.sys, this.info.rootPath);

        const distPath = parsedTsConfig.options.outDir !== undefined ?
          path.resolve(parsedTsConfig.options.outDir) :
          path.resolve(this.info.rootPath, "dist");

        const filePaths = await FsUtils.globAsync(path.resolve(distPath, "**", "*"), {dot: true, nodir: true});

        await filePaths.parallelAsync(async filePath => {
          const relativeFilePath = path.relative(distPath, filePath);
          const targetPath = path.posix.join(publishConfig.path, relativeFilePath);

          try {
            await wsClient.uploadAsync(filePath, targetPath, {
              progressCallback: progress => {
                fileInfos[filePath] = fileInfos[filePath] ?? {};
                fileInfos[filePath].current = progress.current;
                fileInfos[filePath].total = progress.total;

                const displayCurrent = Object.values(fileInfos).sum(item => item.current);
                const displayTotal = Object.values(fileInfos).sum(item => item.total);
                this._logger.debug(`파일 업로드 : (${(Math.floor(displayCurrent * 10000 / displayTotal) / 100).toFixed(2).padStart(6, " ")}%) ${displayCurrent.toLocaleString()} / ${displayTotal.toLocaleString()}`);
              }
            });
          }
          catch (err) {
            throw new SdError(err, this.info.npmConfig.name);
          }
        });
      });

      await wsClient.closeAsync();
    }
  }

  public async initializeCordovaAsync(): Promise<void> {
    const config = this.info.config as ISdAndroidPackageConfig;

    const cordovaProjectPath = path.resolve(this.info.rootPath, ".cordova");
    const cordovaBinPath = path.resolve(process.cwd(), "node_modules/.bin/cordova.cmd");

    await ProcessManager.spawnAsync(`${cordovaBinPath} telemetry on`, {cwd: this.info.rootPath});

    // 프로젝트 생성
    if (!FsUtils.exists(cordovaProjectPath)) {
      console.log(`CORDOVA 프로젝트 생성`);
      await ProcessManager.spawnAsync(`${cordovaBinPath} create "${cordovaProjectPath}" "${config.appId}" "${config.appName}"`, {cwd: process.cwd()});
    }

    // www 폴더 혹시 없으면 생성
    await FsUtils.mkdirsAsync(path.resolve(cordovaProjectPath, "www"));

    // android 플랫폼
    if (!FsUtils.exists(path.resolve(cordovaProjectPath, "platforms/android"))) {
      console.log(`CORDOVA 플랫폼 생성: android`);
      await ProcessManager.spawnAsync(`${cordovaBinPath} platform add android`, {cwd: cordovaProjectPath});
    }

    // browser 플랫폼
    if (!FsUtils.exists(path.resolve(cordovaProjectPath, "platforms/browser"))) {
      console.log(`CORDOVA 플랫폼 생성: browser`);
      await ProcessManager.spawnAsync(`${cordovaBinPath} platform add browser`, {cwd: cordovaProjectPath});
    }

    // MainActivity.java 파일 오류 강제 수정
    /*const mainActivityFilePath = (await FsUtils.globAsync(path.resolve(cordovaProjectPath, "platforms/android/app/src/main/java/!**!/MainActivity.java"))).single();
    if (mainActivityFilePath === undefined) {
      throw new Error("MainActivity.java 파일을 찾을 수 없습니다.");
    }
    let mainActivityFileContent = await FsUtils.readFileAsync(mainActivityFilePath);
    if (!mainActivityFileContent.includes("Solve web view font-size problem")) {
      mainActivityFileContent = mainActivityFileContent.replace(/import org\.apache\.cordova\.\*;/, `import org.apache.cordova.*;
import android.webkit.WebView;
import android.webkit.WebSettings;`);

      mainActivityFileContent = mainActivityFileContent.replace(/loadUrl\(launchUrl\);/, `loadUrl(launchUrl);

        // Solve web view font-size problem
        WebView webView = (WebView)appView.getEngine().getView();
        WebSettings settings = webView.getSettings();
        settings.setTextSize(WebSettings.TextSize.NORMAL);`);

      await FsUtils.writeFileAsync(mainActivityFilePath, mainActivityFileContent);
    }*/

    // 플러그인 설치
    const cordovaFetchConfig = await FsUtils.readJsonAsync(path.resolve(cordovaProjectPath, "plugins/fetch.json"));
    const prevPlugins = Object.values(cordovaFetchConfig)
      .map((item: any) => (item.source.id !== undefined ? item.source.id.replace(/@.*$/, "") : item.source.url));
    if (config.plugins) {
      for (const plugin of config.plugins) {
        if (!prevPlugins.includes(plugin)) {
          console.log(`CORDOVA 플러그인 설치  : ${plugin}`);
          await ProcessManager.spawnAsync(`${cordovaBinPath} plugin add ${plugin}`, {cwd: cordovaProjectPath});
        }
      }
    }
  }

  public async runCordovaOnDeviceAsync(serverIp: string, serverPort: number): Promise<void> {
    if (this.info.config?.type !== "android" || !this.info.config.device) {
      throw new NeverEntryError();
    }

    const cordovaProjectPath = path.resolve(this.info.rootPath, ".cordova");
    const cordovaBinPath = path.resolve(process.cwd(), "node_modules/.bin/cordova.cmd");

    const serverUrl = `http://${serverIp}:${serverPort}`;

    await FsUtils.removeAsync(path.resolve(cordovaProjectPath, "www"));
    await FsUtils.mkdirsAsync(path.resolve(cordovaProjectPath, "www"));
    await FsUtils.writeFileAsync(path.resolve(cordovaProjectPath, "www/index.html"), `'${serverUrl}/${path.basename(this.info.rootPath)}/'로 이동중... <script>setTimeout(function () {window.location.href = "${serverUrl}/${path.basename(this.info.rootPath)}/"}, 3000);</script>`.trim());

    if (this.info.config.icon !== undefined) {
      await FsUtils.copyAsync(
        path.resolve(this.info.rootPath, this.info.config.icon),
        path.resolve(cordovaProjectPath, "res", "icon", "icon.png")
      );
    }

    let configFileContent = await FsUtils.readFileAsync(path.resolve(cordovaProjectPath, "config.xml"));
    configFileContent = configFileContent.replace(/ {4}<allow-navigation href="[^"]*"\s?\/>\n/g, "");
    configFileContent = configFileContent.replace("</widget>", `    <allow-navigation href="${serverUrl}" />\n</widget>`);
    configFileContent = configFileContent.replace("</widget>", `    <allow-navigation href="${serverUrl}/*" />\n</widget>`);
    if (!configFileContent.includes("xmlns:android=\"http://schemas.android.com/apk/res/android\"")) {
      configFileContent = configFileContent.replace(
        "xmlns=\"http://www.w3.org/ns/widgets\"",
        `xmlns="http://www.w3.org/ns/widgets" xmlns:android="http://schemas.android.com/apk/res/android"`
      );
    }
    if (!configFileContent.includes("application android:usesCleartextTraffic=\"true\" />")) {
      configFileContent = configFileContent.replace("<platform name=\"android\">", `<platform name="android">
        <edit-config file="app/src/main/AndroidManifest.xml" mode="merge" target="/manifest/application">
            <application android:usesCleartextTraffic="true" />
        </edit-config>`);
    }

    if (this.info.config.icon !== undefined && !configFileContent.includes("<icon")) {
      configFileContent = configFileContent.replace("</widget>", "    <icon src=\"res/icon/icon.png\" />\r\n</widget>");
    }

    configFileContent = configFileContent.replace("</widget>", "    <preference name=\"Orientation\" value=\"portrait\" />\r\n</widget>");

    await FsUtils.writeFileAsync(path.resolve(cordovaProjectPath, "config.xml"), configFileContent);

    await ProcessManager.spawnAsync(`${cordovaBinPath} run android --device`, {cwd: cordovaProjectPath});
  }

  private async _runAsync(watch: boolean, processManager: ProcessWorkManager, command: string, target?: string): Promise<void> {
    this._logger.debug("workerRun: " + (watch ? "watch" : "run") + ": " + this.name + ": " + command + ": " + target + ": start");

    await processManager.getNextWorker()
      .on("change", data => {
        if (
          data.packageName === this.name &&
          data.command === command &&
          data.target === target
        ) {
          this.emit("change", data);
        }
      })
      .on("complete", data => {
        if (
          data.packageName === this.name &&
          data.command === command &&
          data.target === target
        ) {
          this.emit("complete", data);
        }
      })
      .sendAsync(watch, this.info, command, target, this._devMode);

    this._logger.debug("workerRun: " + (watch ? "watch" : "run") + ": " + this.name + ": " + command + ": " + target + ": end");
  }
}