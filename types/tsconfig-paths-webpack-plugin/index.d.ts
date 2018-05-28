// tslint:disable

declare module "tsconfig-paths-webpack-plugin" {
  import {Plugin} from "webpack";

  interface ITsconfigPathsOptions {
    configFile: string;
  }

  interface TsconfigPathsWebpackPlugin {
    new(options: ITsconfigPathsOptions): Plugin;
  }

  declare const tsconfigPathsWebpackPlugin: TsconfigPathsWebpackPlugin;
  export = tsconfigPathsWebpackPlugin;
}