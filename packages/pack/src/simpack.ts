#!/usr/bin/env node

import * as yargs from "yargs";
import {start} from "./cli/start";
import {build} from "./cli/build";
import {run} from "./cli/run";
import {Logger} from "@simplism/core";
import {publish} from "./cli/publish";
import {update} from "./cli/update";
import {init} from "./cli/init";
import {lint} from "./cli/lint";
import {keygen} from "./cli/keygen";

require("source-map-support").install();

const logger = new Logger("simpack");

yargs
    .help(
        "help",
        "도움말"
    )
    .alias(
        "help",
        "h"
    )
    .version(false as any)
    .command(
        "init",
        "프로젝트를 초기화합니다.",
        yargs => yargs
            .version(false as any),
        async () => await init().catch(
            err => {
                logger.error(err.message);
                process.exit();
            }
        )
    )
    .command(
        "start",
        "서버및 클라이언트를 시작합니다.",
        yargs => yargs
            .version(false as any)
            .options({
                config: {
                    type: "string" as yargs.PositionalOptionsType,
                    describe: "설정 파일 위치",
                    default: "simpack.config.ts"
                },
                client: {
                    type: "string" as yargs.PositionalOptionsType,
                    describe: "시작할 클라이언트 패키지 (미설정시, 모든 클라이언트 실행)"
                },
                env: {
                    type: "string" as yargs.PositionalOptionsType,
                    describe: "SD_ENV 환경변수 설정"
                },
                serverOnly: {
                    type: "boolean" as yargs.PositionalOptionsType,
                    describe: "서버만 시작"
                }
            }),
        async argv => await start(argv as any).catch(
            err => {
                logger.error(err.message);
                process.exit();
            }
        )
    )
    .command(
        "build",
        "빌드합니다.",
        yargs => yargs
            .version(false as any)
            .options({
                config: {
                    type: "string" as yargs.PositionalOptionsType,
                    describe: "설정 파일 위치",
                    default: "simpack.config.ts"
                },
                env: {
                    type: "string" as yargs.PositionalOptionsType,
                    describe: "SD_ENV 환경변수 설정"
                }
            }),
        async argv => await build(argv as any).catch(
            err => {
                logger.error(err.message);
                process.exit();
            }
        )
    )
    .command(
        "run",
        "클라이언트를 실행합니다.",
        yargs => yargs
            .version(false as any)
            .options({
                config: {
                    type: "string" as yargs.PositionalOptionsType,
                    describe: "설정 파일 위치",
                    default: "simpack.config.ts"
                },
                env: {
                    type: "string" as yargs.PositionalOptionsType,
                    describe: "SD_ENV 환경변수 설정"
                },
                client: {
                    type: "string" as yargs.PositionalOptionsType,
                    describe: "실행할 클라이언트 패키지",
                    requiresArg: true
                },
                release: {
                    type: "boolean" as yargs.PositionalOptionsType,
                    describe: "릴리즈버전을 실행합니다. (먼저 \"build\"를 해야합니다.)",
                    default: false
                },
                debug: {
                    type: "boolean" as yargs.PositionalOptionsType,
                    describe: "디버그버전을 실행합니다. (먼저 \"build\"를 해야합니다.)",
                    default: false
                }
            }),
        async argv => await run(argv as any).catch(
            err => {
                logger.error(err.message);
                process.exit();
            }
        )
    )
    .command(
        "publish",
        "빌드된 구성을 배포합니다.",
        yargs => yargs
            .version(false as any)
            .options({
                config: {
                    type: "string" as yargs.PositionalOptionsType,
                    describe: "설정 파일 위치",
                    default: "simpack.config.ts"
                },
                env: {
                    type: "string" as yargs.PositionalOptionsType,
                    describe: "SD_ENV 환경변수 설정",
                    default: undefined
                }
            }),
        async argv => await publish(argv as any).catch(
            err => {
                logger.error(err.message);
                process.exit();
            }
        )
    )
    .command(
        "update",
        "simplism 관련 패키지를 로컬에서 가져옵니다.",
        yargs => yargs
            .version(false as any)
            .options({
                path: {
                    type: "string" as yargs.PositionalOptionsType,
                    describe: "Simplism 소스코드 경로",
                    default: "../simplism"
                },
                watch: {
                    type: "boolean" as yargs.PositionalOptionsType,
                    describe: "파일변경시 자동으로 복사해올 수 있도록 감지모드를 시작합니다.",
                    default: false
                }
            }),
        async argv => await update(argv as any).catch(
            err => {
                logger.error(err.message);
                process.exit();
            }
        )
    )
    .command(
        "lint",
        "코드 오류를 체킹합니다.",
        yargs => yargs
            .version(false as any)
            .options({
                config: {
                    type: "string" as yargs.PositionalOptionsType,
                    describe: "설정 파일 위치",
                    default: "simpack.config.ts"
                },
                fix: {
                    type: "boolean" as yargs.PositionalOptionsType,
                    describe: "자동 수정 여부",
                    default: false
                }
            }),
        async argv => await lint(argv as any)
            .catch(err => {
                logger.error(err.message);
                process.exit();
            })
    )
    .command(
        "keygen",
        "안드로이드 사인키를 생성합니다.",
        yargs => yargs
            .version(false as any)
            .options({
                config: {
                    type: "string" as yargs.PositionalOptionsType,
                    describe: "설정 파일 위치",
                    default: "simpack.config.ts"
                },
                password: {
                    type: "string" as yargs.PositionalOptionsType,
                    describe: "비밀번호",
                    required: true
                }
            }),
        async argv => await keygen(argv as any)
            .catch(err => {
                logger.error(err.message);
                process.exit();
            })
    )
    .argv;
