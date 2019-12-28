const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const path = require("path");

module.exports = function (config) {
  config.set({
    frameworks: ["mocha"],

    files: [
      "../packages/!(*-node)/src/**/*.ts",
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

    webpack: {
      mode: "development",
      devtool: "inline-source-map",
      resolve: {
        extensions: ['.js', '.ts', '.json'],
        plugins: [new TsconfigPathsPlugin({configFile: path.resolve(__dirname, "tsconfig.json")})]
      },
      module: {
        rules: [
          {
            test: /\.ts$/,
            use: {
              loader: 'ts-loader',
              options: {
                configFile: path.resolve(__dirname, "tsconfig.json"),
                transpileOnly: true
              }
            }
          }
        ]
      }
    }
  });
};