#!/usr/bin/env node

import "source-map-support/register";

import * as yargs from "yargs";
import { FsUtils, Logger, LoggerSeverity } from "@simplysm/sd-core-node";
import * as os from "os";
import { EventEmitter } from "events";
import * as crypto from "crypto";
import * as readline from "readline";
import { Writable } from "stream";

EventEmitter.defaultMaxListeners = 0;
process.setMaxListeners(0);

const argv = yargs
  .version(false)
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
    "enc <file> [key]",
    "설정파일을 암호화 합니다.",
    cmd => cmd.version(false)
      .positional("file", {
        type: "string",
        describe: "결과물 파일명"
      })
      .positional("key", {
        type: "string",
        describe: "암호화키"
      })
  )
  .command(
    "dec <file> [key]",
    "설정파일을 복호화 합니다.",
    cmd => cmd.version(false)
      .positional("file", {
        type: "string",
        describe: "암호화된 설정파일"
      })
      .positional("key", {
        type: "string",
        describe: "복호화키"
      })
  )
  .argv;

const logger = Logger.get(["simplysm", "sd-crypto"]);

if (argv.debug) {
  Error.stackTraceLimit = 100; //Infinity;

  process.env.SD_CLI_LOGGER_SEVERITY = "DEBUG";

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

(async (): Promise<void> => {
  if (argv._[0] === "enc") {
    let key = argv.key;

    if (key === undefined) {
      process.stdout.write("password: ", "utf-8");

      // TODO: 암호를 두번 입력하도록 수정
      key = await new Promise(resolve => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: new Writable({
            write: (chunk, encoding, callback) => {
              callback();
            }
          }),
          terminal: true
        });

        rl.question("encrypt-key: ", answer => {
          resolve(answer);
          rl.close();
        });
      });
    }

    if (!Boolean(key)) {
      throw new Error("암호화키가 잘 못 되었습니다.");
    }

    const iv = Buffer.alloc(16, 0);
    const cipheriv = crypto.createCipheriv("aes-192-cbc", crypto.scryptSync(key!, "salt", 24), iv);

    const input = FsUtils.createReadStream(argv.file!);
    const output = FsUtils.createWriteStream(argv.file! + ".enc");
    input.pipe(cipheriv).pipe(output);
  }
  else if (argv._[0] === "dec") {
    const fileName = argv.file!;

    if (!FsUtils.exists(fileName)) {
      throw new Error(fileName + "파일을 찾을 수 없습니다.");
    }

    if (!fileName.endsWith(".enc")) {
      throw new Error(fileName + "파일은 enc 확장자가 아닙니다.");
    }

    let key = argv.key;

    if (key === undefined) {
      process.stdout.write("password: ", "utf-8");

      key = await new Promise(resolve => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: new Writable({
            write: (chunk, encoding, callback) => {
              callback();
            }
          }),
          terminal: true
        });

        rl.question("encrypt-key: ", answer => {
          resolve(answer);
          rl.close();
        });
      });
    }

    if (!Boolean(key)) {
      throw new Error("암호화키가 잘 못 되었습니다.");
    }

    const iv = Buffer.alloc(16, 0);
    const cipheriv = crypto.createDecipheriv("aes-192-cbc", crypto.scryptSync(key!, "salt", 24), iv);
    const input = FsUtils.createReadStream(fileName);
    const output = FsUtils.createWriteStream(fileName.slice(0, -4));
    input.pipe(cipheriv).pipe(output);
  }
  else {
    throw new Error(`명령어가 잘못되었습니다.${os.EOL + os.EOL}\t${argv._[0]}${os.EOL}`);
  }
})().catch(err => {
  logger.error(err);
  process.exit(1);
});