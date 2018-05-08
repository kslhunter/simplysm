// tslint:disable

declare module 'happypack' {
  import {Plugin} from "webpack";

  interface HappyThreadPool {
  }

  interface IHappypackOptions {
    id: string;
    threads?: number;
    threadPool?: HappyThreadPool;
    verbose?: boolean;
    verboseWhenProfiling?: boolean;
    debug?: boolean;
    loaders?: ({ loader: string; options?: object; } | string)[]
  }

  interface HappyPack {
    new(options: IHappypackOptions): Plugin;
  }

  declare const happypack: HappyPack;
  export = happypack;
}