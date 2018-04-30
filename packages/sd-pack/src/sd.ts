import * as yargs from "yargs";
import {build} from "./commands/build";
import {localUpdate} from "./commands/localUpdate";
import {publish} from "./commands/publish";

yargs
    .version(false)
    .help("help", "도움말")
    .alias("help", "h")
    .command("build", "프로젝트를 빌드합니다.",
        (cmd) => cmd.version(false)
            .options({
                watch: {
                    type: "boolean"  as yargs.PositionalOptionsType,
                    describe: "변경을 감지하여 자동으로 다시 빌드합니다.",
                    default: false
                },
                env: {
                    describe: "환경변수를 등록합니다.",
                    default: {}
                },
                production: {
                    type: "boolean"  as yargs.PositionalOptionsType,
                    describe: "배포버전으로 빌드합니다.",
                    default: false
                },
                package: {
                    type: "string"  as yargs.PositionalOptionsType,
                    describe: "빌드할 패키지를 설정합니다."
                }
            }),
        (argv) => build(argv as any)
    )
    .command("publish", "배포합니다.",
        (cmd) => cmd.version(false)
            .options({
                env: {
                    describe: "환경변수를 등록합니다.",
                    default: {}
                }
            }),
        (argv) => publish(argv as any)
    )
    .command("local-update", "로컬에 있는 simplism 패키지로 의존성 모듈을 덮어씁니다. (고급)",
        (cmd) => cmd.version(false)
            .options({
                watch: {
                    type: "boolean"  as yargs.PositionalOptionsType,
                    describe: "변경을 감지하여 자동으로 업데이트합니다.",
                    default: false
                }
            }),
        (argv) => localUpdate(argv as any)
    )
    .argv;
