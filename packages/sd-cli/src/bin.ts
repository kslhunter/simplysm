#!/usr/bin/env node

import * as yargs from "yargs";
import {Logger} from "@simplysm/sd-core-node";
import {SdProject} from "./SdProject";

const argv = yargs
  .version(false)
  .help("help", "도움말")
  .alias("help", "h")
  .command(
    "local-update",
    "프로젝트의 의존성 패키지에, 외부 디렉토리에 있는 패키지 파일을 덮어씁니다.",
    (cmd) =>
      cmd.version(false)
  )
  .command(
    "build",
    "프로젝트의 각 패키지를 빌드합니다.",
    (cmd) =>
      cmd.version(false)
        .options({
          watch: {
            type: "boolean",
            describe: "변경감지 모드로 실행할지 여부",
            default: false
          },
          options: {
            type: "string",
            describe: "빌드 옵션 설정 (설정파일에서 @로 시작하는 부분)"
          }
        })
  )
  .command(
    "publish",
    "프로젝트의 각 패키지를 배포합니다.",
    (cmd) =>
      cmd.version(false)
        .options({
          build: {
            type: "boolean",
            describe: "새로 빌드한 후 배포합니다",
            default: false
          },
          options: {
            type: "string",
            describe: "빌드 옵션 설정 (설정파일에서 @로 시작하는 부분)"
          }
        })
  )
  .argv;

const logger = Logger.get(["simplysm", "sd-cli"]);

(async () => {
  if (argv._[0] === "local-update") {
    const optionsText = argv.options as string | undefined;
    const options = optionsText?.split(",")?.map((item) => item.trim()) ?? [];

    const project = await SdProject.createAsync("development", options);
    await project.localUpdateAsync();
  }
  else if (argv._[0] === "build") {
    const optionsText = argv.options as string | undefined;
    const watch = argv.watch as boolean;
    const mode = argv.watch ? "development" : "production";

    const options = optionsText?.split(",")?.map((item) => item.trim()) ?? [];

    const project = await SdProject.createAsync(mode, options);
    await project.buildAsync(watch);
  }
  else if (argv._[0] === "publish") {
    const optionsText = argv.options as string | undefined;
    const build = argv.build as boolean;
    const options = optionsText?.split(",")?.map((item) => item.trim()) ?? [];

    const project = await SdProject.createAsync("production", options);
    await project.publishAsync(build);
  }
  else {
    throw new Error(`명령어가 잘못되었습니다.\n\n\t${argv._[0]}\n`);
  }
})().catch((err) => {
  logger.error(err);
  process.exit(1);
});
