const HtmlWebpackPlugin = require("html-webpack-plugin");
const fs = require("fs-extra");
const path = require("path");
const nodeExternals = require("webpack-node-externals");
const webpack = require("webpack");
const ts = require("typescript");

module.exports = env => {
  const configPath = ts.findConfigFile(path.resolve(process.cwd(), "tests", env.packageName), ts.sys.fileExists, "tsconfig.json");
  const tsconfig = ts.parseJsonConfigFileContent(fs.readJsonSync(configPath), ts.sys, path.dirname(configPath));
  const alias = {};
  if (tsconfig.options.paths) {
    for (const key of Object.keys(tsconfig.options.paths)) {
      alias[key] = path.resolve(process.cwd(), "packages", env.packageName, tsconfig.options.paths[key][0].replace(/[\\/]src[\\/]([^\\/.]*)\.ts$/, ""));
    }
  }

  return {
    target: "node",
    mode: "development",
    devtool: "inline-source-map",
    externals: [
      nodeExternals()
    ],
    resolve: {
      extensions: [".ts", ".js", ".json"],
      alias
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          loaders: [
            {
              loader: path.resolve(__dirname, "ts-transpile-loader.js"),
              options: {
                logger: this._logger
              }
            }
          ]
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, "index.ejs"),
        BASE_HREF: "/"
      }),
      new webpack.DefinePlugin({
        "process.env": {
          NODE_ENV: JSON.stringify("test")
        }
      })
    ]
  }
};