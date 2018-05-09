import "../../sd-core/src/extensions/ArrayExtensions";
import "../../sd-core/src/extensions/DateExtensions";
import "../../sd-core/src/extensions/ObjectConstructorExtensions";

import * as yargs from "yargs";
import {buildAsync} from "./commands/buildAsync";
import {localUpdateAsync} from "./commands/localUpdateAsync";
import {publishAsync} from "./commands/publishAsync";

// tslint:disable-next-line:no-unused-expression
yargs
  .version(false)
  .help("help", "도움말")
  .alias("help", "h")
  .command("build", "프로젝트를 빌드합니다.", cmd => cmd.version(false)
      .options({
        watch: {
          type: "boolean",
          describe: "변경을 감지하여 자동으로 다시 빌드합니다.",
          default: false
        },
        env: {
          describe: "환경변수를 등록합니다.",
          default: {}
        },
        package: {
          type: "string",
          describe: "빌드할 패키지를 설정합니다."
        }
      }),
    async argv => {
      await buildAsync(argv as any);
    }
  )
  .command("publish", "배포합니다.", cmd => cmd.version(false)
      .options({
        host: {type: "string"},
        port: {type: "number"},
        user: {type: "string"},
        pass: {type: "string"},
        root: {type: "string"}
      }),
    async argv => {
      await publishAsync(argv as any);
    }
  )
  .command("local-update", "로컬에 있는 simplism 패키지로 의존성 모듈을 덮어씁니다. (고급)", cmd => cmd.version(false)
      .options({
        watch: {
          type: "boolean",
          describe: "변경을 감지하여 자동으로 업데이트합니다.",
          default: false
        }
      }),
    async argv => {
      await localUpdateAsync(argv as any);
    }
  )
  .argv;
