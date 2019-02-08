#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import * as yargs from "yargs";
import {Logger} from "@simplysm/common";


const argv = yargs
  .version(false)
  .help("help", "도움말")
  .alias("help", "h")
  .command(
    "init",
    "서버를 초기 설정합니다.",
    cmd => cmd.version(false)
      .options({
        port: {
          type: "number",
          default: 80,
          describe: "서버 포트를 설정합니다."
        }
      })
  )
  .argv as any;

(async () => {
  if (argv._[0] === "init") {
    fs.copyFileSync(path.resolve(__dirname, "../lib/app.js"), path.resolve(process.cwd(), "app.js"));
    fs.writeFileSync(
      "pm2.json",
      JSON.stringify({
        apps: [
          {
            name: process.cwd().replace(/\//g, "\\").split("\\").last(),
            script: "./app.js",
            args: [argv.port.toString()],
            watch: [
              path.resolve(process.cwd(), "node_modules"),
              "pm2.json",
              "package.json",
              "app.js"
            ],
            env: {
              "NODE_ENV": "production"
            }
          }
        ]
      }, undefined, 2)
    );
  }
  else {
    throw new Error("명령어가 잘못 되었습니다.");
  }
})().catch(err => {
  new Logger("@simplysm/cli").error(err);
  process.exit(1);
});