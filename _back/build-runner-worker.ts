#!/usr/bin/env node --import=specifier-resolution-node/register

import { FsUtil } from "@simplysm/sd-core-node";
import path from "path";
import { ISdBuildRunnerWorkerRequest, ISdBuildRunnerWorkerResponse } from "../commons";
import { SdJsLibBuildRunner } from "../pkg-builders/lib/SdJsLibBuildRunner";
import { SdTsLibBuildRunner } from "../pkg-builders/lib/SdTsLibBuildRunner";
import { SdServerBuildRunner } from "../pkg-builders/server/SdServerBuildRunner";
import { SdClientBuildRunner } from "../pkg-builders/client/SdClientBuildRunner";
import { parentPort } from "node:worker_threads";

export default async function (req: ISdBuildRunnerWorkerRequest) {
  const pkgConf = req.projConf.packages[path.basename(req.pkgPath)]!;

  const buildRunnerType =
    pkgConf.type === "server"
      ? SdServerBuildRunner
      : pkgConf.type === "client"
        ? SdClientBuildRunner
        : FsUtil.exists(path.resolve(req.pkgPath, "tsconfig.json"))
          ? SdTsLibBuildRunner
          : SdJsLibBuildRunner;

  const builder = new buildRunnerType(req.projConf, req.pkgPath)
    .on("change", () => sendMessage({ type: "change" }))
    .on("complete", (result) => sendMessage({ type: "complete", result }));

  if (req.cmd === "build") {
    const res = await builder.buildAsync();
    return res.buildMessages;
  } else {
    await builder.watchAsync();
    return;
  }
}

function sendMessage(message: ISdBuildRunnerWorkerResponse): void {
  parentPort!.postMessage(message);
}
