import * as path from "path";
import * as fs from "fs-extra";
import * as childProcess from "child_process";
import {IClientPackageConfig, IProjectConfig} from "../commons/IProjectConfig";
import {CliHelper} from "../commons/CliHelper";

export async function runDeviceAsync(argv: { config?: string; package: string; release: boolean; debug: boolean }): Promise<void> {
  process.env.NODE_ENV = "development";

  let configFilePath = argv.config;
  configFilePath = configFilePath ? path.resolve(process.cwd(), configFilePath)
    : fs.existsSync(path.resolve(process.cwd(), "simplism.ts")) ? path.resolve(process.cwd(), "simplism.ts")
      : fs.existsSync(path.resolve(process.cwd(), "simplism.js")) ? path.resolve(process.cwd(), "simplism.js")
        : path.resolve(process.cwd(), "simplism.json");

  if (path.extname(configFilePath) === ".ts") {
    // tslint:disable-next-line
    require("ts-node/register");
  }

  // tslint:disable-next-line:no-eval
  const projectConfig = eval("require(configFilePath)") as IProjectConfig;

  const config = projectConfig.packages.single(item => item.name === argv.package) as IClientPackageConfig | undefined;
  if (!config || !config.cordova || !config.platforms || !config.platforms.includes("android") || !config.devServer) {
    throw new Error("클라이언트 설정이 잘못되었습니다. [패키지: " + argv.package + "]");
  }

  if (argv.release || argv.debug) {
    const cordovaProjectPath = path.resolve(process.cwd(), "packages", argv.package, ".cordova");

    if (argv.release && config.cordova.sign) {
      fs.copySync(
        path.resolve(process.cwd(), ".sign", config.cordova.sign, "release-signing.jks"),
        path.resolve(cordovaProjectPath, "platforms", "android", "release-signing.jks")
      );
      fs.copySync(
        path.resolve(process.cwd(), ".sign", config.cordova.sign, "release-signing.properties"),
        path.resolve(cordovaProjectPath, "platforms", "android", "release-signing.properties")
      );
    }

    let configFileContent = fs.readFileSync(path.resolve(cordovaProjectPath, "config.xml"), "utf-8");
    configFileContent = configFileContent.replace(/<allow-navigation href="[^"]"\s?\/>/g, "");
    fs.writeFileSync(path.resolve(cordovaProjectPath, "config.xml"), configFileContent, "utf-8");

    const cordovaBinPath = path.resolve(process.cwd(), "node_modules", ".bin", "cordova.cmd");
    childProcess.spawnSync(
      cordovaBinPath,
      [
        "run",
        "android",
        "--device",
        argv.release ? "--release" : ""
      ],
      {
        shell: true,
        stdio: "inherit",
        cwd: cordovaProjectPath
      }
    );
  }
  else {
    const host = CliHelper.getCurrentIP(config.devServer.host);
    const devServerUrl = `http://${host}:${config.devServer.port}`;
    const cordovaProjectPath = path.resolve(process.cwd(), "packages", argv.package, ".cordova");
    fs.removeSync(path.resolve(cordovaProjectPath, "www"));
    fs.mkdirsSync(path.resolve(cordovaProjectPath, "www"));
    fs.writeFileSync(path.resolve(cordovaProjectPath, "www/index.html"), `'${devServerUrl}'로 이동중... <script>window.location.href = "${devServerUrl}";</script>`.trim(), "utf-8");

    let configFileContent = fs.readFileSync(path.resolve(cordovaProjectPath, "config.xml"), "utf-8");
    if (!new RegExp(`<allow-navigation href="${devServerUrl}(/\\*)?"\\s?/>`).test(configFileContent)) {
      configFileContent = configFileContent.replace("</widget>", `<allow-navigation href="${devServerUrl}" /></widget>`);
      configFileContent = configFileContent.replace("</widget>", `<allow-navigation href="${devServerUrl}/*" /></widget>`);
      fs.writeFileSync(path.resolve(cordovaProjectPath, "config.xml"), configFileContent, "utf-8");
    }

    childProcess.spawnSync(
      "cordova",
      ["run", "android", "--device"],
      {
        stdio: "inherit",
        shell: true,
        cwd: cordovaProjectPath
      }
    );
  }
}
