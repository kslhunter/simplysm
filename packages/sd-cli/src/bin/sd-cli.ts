#!/usr/bin/env node --experimental-specifier-resolution=node --experimental-import-meta-resolve

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Logger, LoggerSeverity } from "@simplysm/sd-core-node";
import { SdCliWorkspace } from "../entry-points/SdCliWorkspace";
import { SdCliLocalUpdate } from "../entry-points/SdCliLocalUpdate";
import { SdCliNpm } from "../entry-points/SdCliNpm";
import { SdCliPrepare } from "../entry-points/SdCliPrepare";
import { SdCliFileCrypto } from "../entry-points/SdCliFileCrypto";
import { SdCliCordova } from "../build-tool/SdCliCordova";
import { SdCliElectron } from "../build-tool/SdCliElectron";
import { SdCliProjectGenerator } from "../entry-points/SdCliProjectGenerator";

Error.stackTraceLimit = Infinity;

const argv = (yargs(hideBin(process.argv)) as any)
  .help("help", "도움말")
  .alias("help", "h")
  .options({
    debug: {
      type: "boolean",
      describe: "디버그 로그를 표시할 것인지 여부",
      default: false
    }
  })
  .command(
    "prepare",
    "sd-cli 준비",
    (cmd) => cmd.version(false).hide("help").hide("debug")
  )
  .command(
    "update",
    "패키지 업데이트 (npm update)",
    (cmd) => cmd.version(false).hide("help").hide("debug")
  )
  .command(
    "local-update",
    "로컬 라이브러리 업데이트를 수행합니다.",
    (cmd) => cmd.version(false).hide("help").hide("debug")
      .options({
        config: {
          type: "string",
          describe: "simplysm.json 파일 경로"
        }
      })
  )
  .command(
    "watch",
    "프로젝트의 각 패키지에 대한 변경감지 빌드를 수행합니다.",
    (cmd) => cmd.version(false).hide("help").hide("debug")
      .options({
        config: {
          type: "string",
          describe: "simplysm.json 파일 경로"
        },
        options: {
          type: "string",
          array: true,
          describe: "옵션 설정 (설정파일에서 @로 시작하는 부분)"
        },
        packages: {
          type: "string",
          array: true,
          describe: "수행할 패키지 설정"
        }
      })
  )
  .command(
    "run-electron <package> <url>",
    "변경감지중인 플랫폼을 ELECTRON 앱 형태로 띄웁니다.",
    (cmd) => cmd
      .positional("package", {
        type: "string",
        describe: "패키지명",
        demandOption: true
      })
      .positional("url", {
        type: "string",
        describe: "Webview로 오픈할 URL",
        demandOption: true
      })
      .options({
        config: {
          type: "string",
          describe: "simplysm.json 파일 경로"
        },
        options: {
          type: "string",
          array: true,
          describe: "옵션 설정 (설정파일에서 @로 시작하는 부분)"
        }
      })
  )
  .command(
    "run-cordova <platform> <package> <url>",
    "변경감지중인 플랫폼을 코도바 디바이스에 앱 형태로 띄웁니다.",
    (cmd) => cmd
      .positional("platform", {
        type: "string",
        describe: "빌드 플랫폼(android,...)",
        demandOption: true
      })
      .positional("package", {
        type: "string",
        describe: "패키지명",
        demandOption: true
      })
      .positional("url", {
        type: "string",
        describe: "Webview로 오픈할 URL",
        demandOption: true
      })
  )
  .command(
    "build",
    "프로젝트의 각 패키지에 대한 빌드를 수행합니다.",
    (cmd) => cmd.version(false).hide("help").hide("debug")
      .options({
        config: {
          type: "string",
          describe: "simplysm.json 파일 경로"
        },
        options: {
          type: "string",
          array: true,
          describe: "옵션 설정 (설정파일에서 @로 시작하는 부분)"
        },
        packages: {
          type: "string",
          array: true,
          describe: "수행할 패키지 설정"
        }
      })
  )
  .command(
    "publish",
    "프로젝트의 각 패키지를 배포합니다.",
    (cmd) => cmd.version(false).hide("help").hide("debug")
      .options({
        noBuild: {
          type: "boolean",
          describe: "빌드를 하지않고 배포합니다.",
          default: false
        },
        config: {
          type: "string",
          describe: "simplysm.json 파일 경로"
        },
        options: {
          type: "string",
          array: true,
          describe: "옵션 설정 (설정파일에서 @로 시작하는 부분)"
        },
        packages: {
          type: "string",
          array: true,
          describe: "수행할 패키지 설정"
        }
      })
  )
  .command(
    "enc-file <file>",
    "파일을 암호화 합니다.",
    (cmd) => cmd.version(false).hide("help").hide("debug")
      .positional("file", {
        type: "string",
        describe: "암호화할 파일명",
        demandOption: true
      })
  )
  .command(
    "dec-file <file>",
    "파일을 복호화 합니다.",
    (cmd) => cmd.version(false).hide("help").hide("debug")
      .positional("file", {
        type: "string",
        describe: "암호화된 파일명",
        demandOption: true
      })
  )
  .command(
    "init <description> <author> <gitUrl> [name]",
    "프로젝트를 초기화 합니다.",
    (cmd) => cmd.version(false).hide("help").hide("debug")
      .positional("description", {
        type: "string",
        describe: "프로젝트 설명(=명칭)",
        demandOption: true
      })
      .positional("author", {
        type: "string",
        describe: "작성자",
        demandOption: true
      })
      .positional("gitUrl", {
        type: "string",
        describe: "소스코드 관리를 위한 GIT 레파지토리 URL",
        demandOption: true
      })
      .positional("name", {
        type: "string",
        describe: "프로젝트 영문명 (기본값: 최종폴더명)"
      })
      .example([
        ["$0 init sample 샘플프로젝트 홍길동 https://github.com/my/sample.git"]
      ])
  )
  .command(
    "add",
    "프로젝트에 패키지/기능등을 추가합니다.",
    (cmd) => cmd.version(false).hide("help").hide("debug")
      .command(
        "ts-lib <name> <description>",
        "타입스트립트 라이브러리 패키지를 추가합니다.",
        (cmd1) => cmd1.version(false).hide("help").hide("debug")
          .positional("name", {
            type: "string",
            describe: "패키지명",
            demandOption: true
          })
          .positional("description", {
            type: "string",
            describe: "패키지설명",
            demandOption: true
          })
          .options({
            useDom: {
              type: "boolean",
              describe: "DOM객체(window, document 등) 사용 여부",
              default: false
            },
            isForAngular: {
              type: "boolean",
              describe: "Angular 라이브러리 여부 (useDom 옵션을 덮어씁니다)",
              default: false
            }
          })
          .example([
            ["$0 add ts-lib common 공통모듈"],
            ["$0 sd-cli add ts-lib client-common \"클라이언트 공통\" --useDom"]
          ])
      )
      .command(
        "db-lib <name>",
        "DB 라이브러리 패키지를 추가합니다.",
        (cmd1) => cmd1.version(false).hide("help").hide("debug")
          .positional("name", {
            type: "string",
            describe: "패키지명",
            demandOption: true
          })
          .example([
            ["$0 add db-lib main"]
          ])
      )
      .command(
        "db-model <dbName> <category> <name> <description>",
        "DB 패키지에 모델를 추가합니다.",
        (cmd1) => cmd1.version(false).hide("help").hide("debug")
          .positional("dbName", {
            type: "string",
            describe: "DB 패키지 영문명 = 'DbContext'명칭",
            demandOption: true
          })
          .positional("category", {
            type: "string",
            describe: "추가할 모델의 분류명",
            demandOption: true
          })
          .positional("name", {
            type: "string",
            describe: "추가할 모델의 명칭 (테이블명)",
            demandOption: true
          })
          .positional("description", {
            type: "string",
            describe: "추가할 모델의 설명 (테이블 설명)",
            demandOption: true
          })
          .example([
            ["$0 add db-model main base Employee 직원"]
          ])
      )
      .command(
        "server [name] [description]",
        "서버 패키지를 추가합니다.",
        (cmd1) => cmd1.version(false).hide("help").hide("debug")
          .positional("name", {
            type: "string",
            describe: "패키지명"
          })
          .positional("description", {
            type: "string",
            describe: "패키지 설명"
          })
          .example([
            ["$0 add server"]
          ])
      )
      .command(
        "client <name> <description> <serverName>",
        "클라이언트 패키지를 추가합니다.",
        (cmd1) => cmd1.version(false).hide("help").hide("debug")
          .positional("name", {
            type: "string",
            describe: "패키지명",
            demandOption: true
          })
          .positional("description", {
            type: "string",
            describe: "패키지 설명",
            demandOption: true
          })
          .positional("serverName", {
            type: "string",
            describe: "서버 패키지명",
            demandOption: true
          })
          .example([
            ["$0 add client admin 관리자 server"]
          ])
      )
      .command(
        "page <pkgName> <name> [category]",
        "패키지에 페이지를 추가합니다.",
        (cmd1) => cmd1.version(false).hide("help").hide("debug")
          .positional("pkgName", {
            type: "string",
            describe: "패키지명",
            demandOption: true
          })
          .positional("name", {
            type: "string",
            describe: "페이지명",
            demandOption: true
          })
          .positional("category", {
            type: "string",
            describe: "추가할 페이지의 분류명"
          })
          .options({
            isRouteParent: {
              type: "boolean",
              describe: "router-outlet 포함 여부",
              default: false
            }
          })
          .example([
            ["$0 add page admin Employee home/base"]
          ])
      )
  )
  .parseSync();

if (Boolean(argv.debug)) {
  process.env["SD_CLI_LOGGER_SEVERITY"] = "DEBUG";

  Logger.setConfig({
    console: {
      level: LoggerSeverity.debug
    }
  });
}
else {
  Logger.setConfig({
    dot: true
  });
}

const logger = Logger.get(["simplysm", "sd-cli", "bin", "sd-cli"]);

(async () => {
  if (argv._[0] === "prepare") {
    await new SdCliPrepare()
      .prepareAsync();
  }
  else if (argv._[0] === "update") {
    await new SdCliNpm(process.cwd())
      .updateAsync();
  }
  else if (argv._[0] === "local-update") {
    await new SdCliLocalUpdate(process.cwd())
      .runAsync({
        confFileRelPath: argv.config ?? "simplysm.json"
      });
  }
  else if (argv._[0] === "watch") {
    await new SdCliWorkspace(process.cwd())
      .watchAsync({
        confFileRelPath: argv.config ?? "simplysm.json",
        optNames: argv.options ?? [],
        pkgs: argv.packages ?? []
      });
  }
  else if (argv._[0] === "run-electron") {
    await new SdCliElectron(process.cwd())
      .runWebviewOnDeviceAsync(
        argv.package,
        argv.url,
        {
          confFileRelPath: argv.config ?? "simplysm.json",
          optNames: argv.options ?? []
        }
      );
  }
  else if (argv._[0] === "run-cordova") {
    await SdCliCordova.runWebviewOnDeviceAsync(
      process.cwd(),
      argv.platform as "browser" | "android",
      argv.package,
      argv.url
    );
  }
  else if (argv._[0] === "build") {
    await new SdCliWorkspace(process.cwd())
      .buildAsync({
        confFileRelPath: argv.config ?? "simplysm.json",
        optNames: argv.options ?? [],
        pkgs: argv.packages ?? []
      });
    process.exit(0);
  }
  else if (argv._[0] === "publish") {
    await new SdCliWorkspace(process.cwd())
      .publishAsync({
        noBuild: argv.noBuild,
        confFileRelPath: argv.config ?? "simplysm.json",
        optNames: argv.options ?? [],
        pkgs: argv.packages ?? []
      });
    if (!Boolean(argv.noBuild)) {
      process.exit(0);
    }
  }
  else if (argv._[0] === "enc-file") {
    await new SdCliFileCrypto().encryptAsync(argv.file!);
  }
  else if (argv._[0] === "dec-file") {
    await new SdCliFileCrypto().decryptAsync(argv.file!);
  }
  else if (argv._[0] === "init") {
    await new SdCliProjectGenerator(process.cwd()).initAsync({
      name: argv.name,
      description: argv.description!,
      author: argv.author,
      gitUrl: argv.gitUrl
    });
  }
  else if (argv._[0] === "add") {
    if (argv._[1] === "ts-lib") {
      await new SdCliProjectGenerator(process.cwd()).addTsLibAsync({
        name: argv.name!,
        description: argv.description!,
        useDom: argv.useDom,
        isForAngular: argv.isForAngular
      });
    }
    else if (argv._[1] === "db-lib") {
      await new SdCliProjectGenerator(process.cwd()).addDbLibAsync({
        name: argv.name!
      });
    }
    else if (argv._[1] === "db-model") {
      await new SdCliProjectGenerator(process.cwd()).addDbLibModelAsync({
        dbPkgName: argv.dbName,
        category: argv.category,
        name: argv.name!,
        description: argv.description!
      });
    }
    else if (argv._[1] === "page") {
      await new SdCliProjectGenerator(process.cwd()).addPageAsync({
        pkgName: argv.pkgName,
        category: argv.category,
        name: argv.name!,
        isRouteParent: argv.isRouteParent
      });
    }
    else if (argv._[1] === "server") {
      await new SdCliProjectGenerator(process.cwd()).addServerAsync({
        name: argv.name,
        description: argv.description
      });
    }
    else if (argv._[1] === "client") {
      await new SdCliProjectGenerator(process.cwd()).addClientAsync({
        name: argv.name!,
        description: argv.description!,
        serverName: argv.serverName
      });
    }
    else {
      throw new Error(`명령어가 잘못 되었습니다.\n\t${argv._[1]}\n`);
    }
  }
  else {
    throw new Error(`명령어가 잘못 되었습니다.\n\t${argv._[0]}\n`);
  }
})().catch((err) => {
  logger.error(err);
  process.exit(1);
});
