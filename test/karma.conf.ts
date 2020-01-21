import {TsconfigPathsPlugin} from "tsconfig-paths-webpack-plugin";
import * as path from "path";
import {ServerMiddleware} from "./config/ServerMiddleware";

delete process.env.TS_NODE_PROJECT;
delete process.env.TS_NODE_TRANSPILE_ONLY;

module.exports = function (config: any): void {
  config.set({
    frameworks: ["mocha"],

    files: [
      "../packages/!(*-cli|*-server|*-node)/src/**/*.ts",
      "src-browser/**/*.ts",
      "src-common/**/*.ts"
    ],

    preprocessors: {
      "**/*.ts": ["webpack", "sourcemap"],
      "../packages/**/*.ts": ["webpack", "sourcemap"]
    },

    reporters: ["progress"],

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
            configFile: path.resolve(__dirname, "tsconfig.json")
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
                configFile: path.resolve(__dirname, "tsconfig.json"),
                transpileOnly: true
              }
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
