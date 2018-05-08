import {Logger} from "@simplism/sd-core";
import * as yargs from "yargs";
import {buildAsync} from "./commands/buildAsync";
import {localUpdateAsync} from "./commands/localUpdateAsync";
import {publishAsync} from "./commands/publishAsync";

const argv = yargs
  .version(false)
  .help("help", "도움말")
  .alias("help", "h")
  .command(
    "build",
    "프로젝트를 빌드합니다.",
    cmd => cmd.version(false)
      .options({
        watch: {
          type: "boolean",
          describe: "변경을 감지하여 자동으로 다시 빌드합니다.",
          default: false
        },
        config: {
          type: "string",
          describe: "설정파일 경로를 설정합니다.",
          default: "sd-pack.config.js"
        },
        package: {
          type: "string",
          describe: "빌드할 패키지를 설정합니다. 콤마로 구분할 수 있습니다."
        },
        localUpdateProject: {
          type: "string",
          describe: "로컬에서 작업중인 특정 프로젝트의 패키지들을 'node_modules'로 연동합니다. 이 옵션은 반드시 '--watch'와 함께 사용되어야 합니다."
        }
      })
  )
  .command(
    "publish",
    "배포합니다.",
    cmd => cmd.version(false)
      .options({
        config: {
          type: "string",
          describe: "설정파일 경로를 설정합니다.",
          default: "sd-pack.config.js"
        }
      })
  )
  .command(
    "localUpdate",
    "로컬에 있는 simplism 패키지로 의존성 모듈을 덮어씁니다. (고급)",
    cmd => cmd.version(false)
      .options({
        project: {
          type: "string",
          describe: "연동할 프로젝트명. 해당 디렉토리가 이 프로젝트의 경로와 동일한 경로에 있어야 합니다.",
          required: true
        },
        watch: {
          type: "boolean",
          describe: "변경을 감지하여 자동으로 업데이트합니다.",
          default: false
        }
      })
  )
  .argv;

(async () => {
  const command = argv._[0];

  if (command === "build") {
    Object.assign(process.env, argv.env);
    await buildAsync({
      watch: argv.watch,
      config: argv.config,
      package: argv.package,
      localUpdateProject: argv.localUpdateProject
    });
  }
  else if (command === "publish") {
    await publishAsync({config: argv.config});
  }
  else if (command === "localUpdate") {
    await localUpdateAsync({
      project: argv.project,
      watch: argv.watch
    });
  }
  else {
    throw new Error("명령이 잘못되었습니다.");
  }
})().catch(err => new Logger("@simplism/sd-pack", "bin").error(err));