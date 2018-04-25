import * as yargs from "yargs";
import {build} from "./commands/build";
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
                }
            }),
        (argv) => build(argv as any)
    )
    .command("publish", "배포합니다.",
        (cmd) => cmd.version(false),
        () => publish())
    .argv;
