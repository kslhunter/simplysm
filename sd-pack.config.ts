import {IProjectConfig} from "./packages/pack/src";

const config: IProjectConfig = {
  packages: [
    {name: "angular", type: "library"},
    {name: "assert", type: "library"},
    {name: "core", type: "library"},
    {name: "excel", type: "library"},
    {name: "mailer", type: "library"},
    {name: "orm-client", type: "library"},
    {name: "pack", type: "library"},
    {name: "storage", type: "library"},
    {name: "websocket-common", type: "library"},
    {name: "websocket-client", type: "library"},
    {name: "websocket-server", type: "library"},
    {name: "websocket-server-orm-service", type: "library"}
  ]
};

export = config;