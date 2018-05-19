import {IProjectConfig} from "./packages/pack/src/commons/IProjectConfig";

const config: IProjectConfig = {
  packages: [
    {
      name: "core",
      type: "library",
    },
    {
      name: "excel",
      type: "library",
    },
    {
      name: "mailer",
      type: "library",
    },
    {
      name: "pack",
      type: "library"
    },
    {
      name: "storage",
      type: "library"
    },
    {
      name: "websocket-client",
      type: "library"
    },
    {
      name: "websocket-server",
      type: "library"
    }
  ]
};
export = config;