import path from "path";
import { FsUtils } from "./FsUtils";
import os from "os";
import { DateTime, DeepPartial, MathUtils, ObjectUtils } from "@simplysm/sd-core-common";

export enum SdLoggerStyle {
  clear = "\x1b[0m",

  fgGray = "\x1b[90m",
  fgBlack = "\x1b[30m",
  fgWhite = "\x1b[37m",

  fgRed = "\x1b[31m",
  fgGreen = "\x1b[32m",
  fgYellow = "\x1b[33m",
  fgBlue = "\x1b[34m",
  fgMagenta = "\x1b[35m",
  fgCyan = "\x1b[36m",

  bgBlack = "\x1b[40m\x1b[97m",
  bgRed = "\x1b[41m\x1b[97m",
  bgGreen = "\x1b[42m\x1b[97m",
  bgYellow = "\x1b[43m\x1b[97m",
  bgBlue = "\x1b[44m\x1b[97m",
  bgMagenta = "\x1b[45m\x1b[97m",
  bgWhite = "\x1b[46m\x1b[97m",
}

export enum SdLoggerSeverity {
  debug = "debug",
  log = "log",
  info = "info",
  warn = "warn",
  error = "error",
  none = "",
}
export type TSdLoggerSeverity = Exclude<keyof typeof SdLoggerSeverity, "none">;

export interface ISdLoggerConfig {
  dot: boolean;

  console: {
    style: SdLoggerStyle;
    level: SdLoggerSeverity;
    styles: {
      debug: SdLoggerStyle;
      log: SdLoggerStyle;
      info: SdLoggerStyle;
      warn: SdLoggerStyle;
      error: SdLoggerStyle;
    };
  };

  file: {
    level: SdLoggerSeverity;
    outDir: string;
    maxBytes?: number;
  };
}

export interface ISdLoggerHistory {
  datetime: DateTime;
  group: string[];
  severity: SdLoggerSeverity;
  logs: any[];
}

export class SdLogger {
  static configs = new Map<string, DeepPartial<ISdLoggerConfig>>();
  static #historyLength = 0;

  readonly #randomForStyle = MathUtils.getRandomInt(4, 9);

  static get(group: string[] = []): SdLogger {
    return new SdLogger(group);
  }

  static setConfig(group: string[], config: DeepPartial<ISdLoggerConfig>): void;
  static setConfig(config: DeepPartial<ISdLoggerConfig>): void;
  static setConfig(
    arg1: string[] | DeepPartial<ISdLoggerConfig>,
    arg2?: DeepPartial<ISdLoggerConfig>,
  ): void {
    const group = (arg2 !== undefined ? arg1 : []) as string[];
    const config = (arg2 ?? arg1) as DeepPartial<ISdLoggerConfig>;

    this.configs.set(group.join("_"), config);
  }

  static restoreConfig(): void {
    this.configs.clear();
  }

  static setHistoryLength(len: number): void {
    this.#historyLength = len;
  }

  static history: ISdLoggerHistory[] = [];

  private constructor(private readonly _group: string[]) {}

  debug(...args: any[]): void {
    this.#write(SdLoggerSeverity.debug, args);
  }

  log(...args: any[]): void {
    this.#write(SdLoggerSeverity.log, args);
  }

  info(...args: any[]): void {
    this.#write(SdLoggerSeverity.info, args);
  }

  warn(...args: any[]): void {
    this.#write(SdLoggerSeverity.warn, args);
  }

  error(...args: any[]): void {
    this.#write(SdLoggerSeverity.error, args);
  }

  #write(severity: SdLoggerSeverity, logs: any[]): void {
    const config = this.#getConfig();
    const now = new DateTime();

    const severityIndex = Object.values(SdLoggerSeverity).indexOf(severity);
    const consoleLevelIndex = Object.values(SdLoggerSeverity).indexOf(config.console.level);
    const fileLevelIndex = Object.values(SdLoggerSeverity).indexOf(config.file.level);

    if (severityIndex >= consoleLevelIndex) {
      if (typeof process.stdout.clearLine === "function") {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
      }

      const loggerStyle: SdLoggerStyle = config.console.styles[severity];

      let headMessage: string = SdLoggerStyle.fgGray;
      headMessage += now.toFormatString("yyyy-MM-dd HH:mm:ss.fff") + " ";
      if (this._group.length > 0) {
        headMessage += config.console.style + "[" + this._group.join(".") + "] ";
      }
      headMessage += loggerStyle;
      headMessage += severity.toUpperCase().padStart(5, " ");

      const logMessages = logs.map((log) =>
        log instanceof Error && log.stack !== undefined ? log.stack : log,
      );
      const tailMessage = SdLoggerStyle.clear;

      // eslint-disable-next-line no-console
      console.log(headMessage, ...logMessages, tailMessage);
    } else if (config.dot) {
      process.stdout.write(".");
    }

    if (severityIndex >= fileLevelIndex) {
      let text = now.toFormatString("yyyy-MM-dd HH:mm:ss.fff") + " ";
      text += this._group.length > 0 ? "[" + this._group.join(".") + "] " : "";
      text += severity.toUpperCase().padStart(5, " ") + os.EOL;

      for (const log of logs) {
        let logString: string;

        // 색상빼기
        if (typeof log === "string") {
          logString = log.replace(
            /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
            "",
          );
        } else if (typeof log.toString === "function" && !/^\[.*]$/.test(log.toString())) {
          logString = log.toString();
        } else {
          logString = JSON.stringify(log);
        }

        text += logString + os.EOL;
      }

      const outPath = path.resolve(config.file.outDir, now.toFormatString("yyyyMMdd"));
      FsUtils.mkdirs(outPath);

      const fileNames = FsUtils.readdir(outPath);
      const lastFileSeq = fileNames
        .filter((fileName) => fileName.endsWith(".log"))
        .map((fileName) => Number(path.basename(fileName, path.extname(fileName))))
        .filter((item) => !Number.isNaN(item))
        .max();

      let logFileName = "1.log";
      if (lastFileSeq !== undefined) {
        const lstat = FsUtils.lstat(path.resolve(outPath, `${lastFileSeq}.log`));
        if (lstat.size > (config.file.maxBytes ?? 500 * 1000)) {
          logFileName = `${lastFileSeq + 1}.log`;
        } else {
          logFileName = lastFileSeq.toString() + ".log";
        }
      }

      try {
        const logFilePath = path.resolve(outPath, logFileName);
        if (FsUtils.exists(logFilePath)) {
          FsUtils.appendFile(logFilePath, text);
        } else {
          FsUtils.writeFile(logFilePath, text);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log("파일쓰기실패", err.message);
      }
    }

    if (SdLogger.#historyLength > 0) {
      SdLogger.history.push({
        datetime: now,
        group: this._group,
        severity,
        logs,
      });

      while (SdLogger.history.length > SdLogger.#historyLength) {
        SdLogger.history.remove(SdLogger.history[0]);
      }
    }
  }

  #getConfig(): ISdLoggerConfig {
    let config: ISdLoggerConfig = {
      dot: false,

      console: {
        style: SdLoggerStyle[Object.keys(SdLoggerStyle)[this.#randomForStyle]],
        level: SdLoggerSeverity.log,
        styles: {
          debug: SdLoggerStyle.fgGray,
          log: SdLoggerStyle.clear,
          info: SdLoggerStyle.fgCyan,
          warn: SdLoggerStyle.fgYellow,
          error: SdLoggerStyle.fgRed,
        },
      },

      file: {
        level: SdLoggerSeverity.none,
        outDir: path.resolve(process.cwd(), "_logs"),
        maxBytes: 300 * 1000,
      },
    };

    const currGroup: string[] = [];
    config = ObjectUtils.merge(config, SdLogger.configs.get(currGroup.join("_")));
    for (const groupItem of this._group) {
      currGroup.push(groupItem);

      if (SdLogger.configs.has(currGroup.join("_"))) {
        config = ObjectUtils.merge(config, SdLogger.configs.get(currGroup.join("_")));
      }
    }

    return config;
  }
}
