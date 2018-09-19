import * as fs from "fs-extra";
import {spawnAsync} from "../commons/spawnAsync";
import * as path from "path";
import {IProjectConfig} from "../commons/IProjectConfig";

export async function testAsync(argv: { config?: string; package?: string }): Promise<void> {
  process.env.NODE_ENV = "development";

  let configFilePath = argv.config;
  if (!configFilePath) {
    configFilePath = fs.existsSync(path.resolve(process.cwd(), "simplism.ts")) ? path.resolve(process.cwd(), "simplism.ts")
      : fs.existsSync(path.resolve(process.cwd(), "simplism.js")) ? path.resolve(process.cwd(), "simplism.js")
        : path.resolve(process.cwd(), "simplism.json");
    console.log(configFilePath);
  }

  if (path.extname(configFilePath) === ".ts") {
    // tslint:disable-next-line
    require("ts-node/register");
  }

  // tslint:disable-next-line:no-eval
  const projectConfig = eval("require(configFilePath)") as IProjectConfig;

  if (!projectConfig.tests) {
    throw new Error(`${argv.config}에 테스트 설정이 없습니다.`);
  }

  const loadersPath = (...args: string[]): string => {
    return fs.existsSync(path.resolve(process.cwd(), "node_modules/@simplism/cli/loaders"))
      ? path.resolve(process.cwd(), "node_modules/@simplism/cli/loaders", ...args)
      : path.resolve(__dirname, "../../loaders", ...args);
  };

  const runAsync = async (packageName: string) => {
    const testConfig = projectConfig.tests!.single(item => item.name === packageName);
    if (!testConfig) {
      throw new Error(`테스트 패키지 ${packageName}에 대한 테스트 설정이 없습니다.`);
    }

    const includeArgs = testConfig.packages.mapMany(item => [`--include`, `packages/${item}/src/**`]);

    const shimRequireArg = testConfig.angular ? [`--require`, `"${loadersPath("test-angular.shim.js")}"`] :
      testConfig.jsdom ? [`--require`, `"${loadersPath("test-jsdom.shim.js")}"`]
        : [];

    const requireOrWebpackConfig = testConfig.angular ? [
        "--webpack-config", `"${loadersPath("test-angular-webpack.config.js")}"`,
        "--webpack-env.packageName", `"${packageName}"`
      ]
      : [
        `--require`, `ts-node/register`,
        `--require`, `tsconfig-paths/register`
      ];

    await spawnAsync(
      `테스트:${packageName}`,
      [
        `nyc`,
        `--all`,
        `--report-dir`, `coverage/${packageName}`,
        `--temp-directory`, `.nyc_output/${packageName}`,
        ...includeArgs,
        `--reporter`, `html`,
        `--extension`, `.ts`,

        testConfig.angular ? `mocha-webpack` : `mocha`,
        ...requireOrWebpackConfig,
        ...shimRequireArg,
        `--bail`,
        `--timeout`, `10000`,
        `tests/${packageName}/**/*.spec.ts`
      ],
      {
        ...process.env,
        TS_NODE_PROJECT: `tests/${packageName}/tsconfig.json`,
        NODE_ENV: "test",
        JSDOM_CONFIG: JSON.stringify(testConfig.jsdom || testConfig.angular)
      }
    );
  };

  if (!argv.package) {
    fs.removeSync(path.resolve(process.cwd(), ".nyc_output"));
    fs.removeSync(path.resolve(process.cwd(), "coverage"));

    const promiseList: Promise<void>[] = [];
    for (const testConfig of projectConfig.tests) {
      promiseList.push(runAsync(testConfig.name));
    }
    await Promise.all(promiseList);
  }
  else {
    for (const pack of argv.package.split(",")) {
      fs.removeSync(path.resolve(process.cwd(), ".nyc_output", pack.trim()));
      fs.removeSync(path.resolve(process.cwd(), "coverage", pack.trim()));

      await runAsync(pack.trim());
    }
  }
}