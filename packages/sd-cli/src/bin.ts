import * as yargs from "yargs";
import { SdProjectBuilder } from "./SdProjectBuilder";
import * as sourceMapSupport from "source-map-support";
import { Logger } from "@simplysm/sd-common";

sourceMapSupport.install();
process.setMaxListeners(0);

const argv = yargs
  .version(false)
  .help("help", "도움말")
  .alias("help", "h")
  .command("bootstrap", "프로젝트의 각 패키지 세팅을 다시 합니다.", cmd => cmd.version(false))
  .command("local-update", "프로젝트의 의존성 패키지에, 외부 디렉토리에 있는 패키지 파일을 덮어씁니다.", cmd =>
    cmd.version(false)
  )
  .command("watch", "프로젝트의 각 패키지를 변경감지 모드로 시작합니다.", cmd =>
    cmd.version(false).options({
      packages: {
        type: "string",
        describe: "수행할 패키지를 선택합니다."
      },
      option: {
        type: "string",
        describe:
          "추가옵션을 줍니다. ('remote'로 설정할 경우, 설정 중 'development'와 'development.remote'를 결합하여 가져옵니다.)"
      }
    })
  )
  .command("build", "프로젝트의 각 패키지를 빌드합니다.", cmd =>
    cmd.version(false).options({
      packages: {
        type: "string",
        describe: "수행할 패키지를 선택합니다."
      }
    })
  )
  .command("publish", "프로젝트의 각 패키지를 배포합니다.", cmd =>
    cmd.version(false).options({
      build: {
        type: "boolean",
        describe: "빌드후에 배포합니다.",
        default: false
      },
      noCommit: {
        type: "boolean",
        describe: "커밋하지 않습니다.",
        default: false
      },
      packages: {
        type: "string",
        describe: "수행할 패키지를 선택합니다."
      }
    })
  ).argv;

(async () => {
  if (argv._[0] === "bootstrap") {
    await new SdProjectBuilder().bootstrapAsync();
    process.exit(0);
  } else if (argv._[0] === "local-update") {
    await new SdProjectBuilder().localUpdateAsync();
    process.exit(0);
  } else if (argv._[0] === "watch") {
    await new SdProjectBuilder().watchAsync(argv as any);
  } else if (argv._[0] === "build") {
    await new SdProjectBuilder().buildAsync(argv as any);
    process.exit(0);
  } else if (argv._[0] === "publish") {
    await new SdProjectBuilder().publishAsync(argv as any);
    process.exit(0);
  } else {
    throw new Error("명령어가 잘못 되었습니다.");
  }
})().catch(err => {
  new Logger("@simplysm/sd-cli").error(err);
  process.exit(1);
});
