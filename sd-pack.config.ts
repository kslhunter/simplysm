import {IProjectConfig} from "./packages/pack/src/commons/IProjectConfig";

const config: IProjectConfig = {
  packages: [
    {
      name: "core",
      type: "library",
    },
    {
      name: "pack",
      type: "library"
    }
  ]
};
export = config;