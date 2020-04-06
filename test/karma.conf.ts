import {TsconfigPathsPlugin} from "tsconfig-paths-webpack-plugin";
import * as path from "path";
import {ServerMiddleware} from "./server/ServerMiddleware";

delete process.env.TS_NODE_PROJECT;
delete process.env.TS_NODE_TRANSPILE_ONLY;

module.exports = function (config: any): void {
  config.set({
    frameworks: ["mocha"],

    files: [
      "../packages/sd-core-common/src/**/*.ts",
      "../packages/sd-core-browser/src/**/*.ts",
      "../packages/sd-orm-common/src/**/*.ts",
      "src/common/**/*.ts",
      "src/browser/**/*.ts"
    ],

    preprocessors: {
      "**/*.ts": ["webpack", "sourcemap"],
      "../packages/*/src/**/*.ts": ["webpack", "sourcemap"]
    },

    reporters: ["coverage-istanbul"],
    coverageIstanbulReporter: {
      reports: ["lcovonly"],
      fixWebpackSourcePaths: true
    },

    browsers: ["ChromeHeadless", "IE"],

    singleRun: true,

    client: {
      mocha: {
        timeout: 10000
      }
    },

    webpack: {
      mode: "development",
      devtool: "inline-source-map",
      resolve: {
        extensions: [".js", ".ts", ".json"],
        plugins: [
          new TsconfigPathsPlugin({
            configFile: path.resolve(__dirname, "tsconfig-browser.json")
          })
        ]
      },
      module: {
        rules: [
          {
            test: /\.ts$/,
            use: {
              loader: "ts-loader",
              options: {
                configFile: path.resolve(__dirname, "tsconfig-browser.json"),
                transpileOnly: true
              }
            }
          },
          {
            test: /\.ts$/,
            exclude: [__dirname],
            enforce: "post",
            use: {
              loader: "istanbul-instrumenter-loader",
              options: {esModules: true}
            }
          }
        ]
      }
    },
    middleware: ["custom"],
    plugins: [
      "karma-*",
      {
        "middleware:custom": ["factory", function (): any {
          return async function (req: any, res: any, next: any): Promise<void> {
            await ServerMiddleware.middlewareAsync(req, res, next);
          };
        }]
      }
    ]
  });
};
