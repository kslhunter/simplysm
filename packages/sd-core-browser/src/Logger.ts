import {DateTime, DeepPartial, ObjectUtil} from "@simplysm/sd-core-common";

export enum LoggerStyle {
  clear = "background: transparent; color: black;",

  fgGray = "color: gray;",
  fgBlack = "color: black;",
  fgWhite = "color: white;",

  fgRed = "color: red;",
  fgGreen = "color: green;",
  fgYellow = "color: orange;",
  fgBlue = "color: blue;",
  fgMagenta = "color: magenta;",
  fgCyan = "color: cyan;",

  bgBlack = "background: black; color: white;",
  bgRed = "background: red; color: white;",
  bgGreen = "background: green; color: white;",
  bgYellow = "background: orange; color: white;",
  bgBlue = "background: blue; color: white;",
  bgMagenta = "background: magenta; color: white;",
  bgWhite = "background: white; color: black;"
}

export enum LoggerSeverity {
  log = "log",
  info = "info",
  warn = "warn",
  error = "error",
  none = ""
}

export interface ILoggerConfig {
  console: {
    level: LoggerSeverity;
    styles: {
      log: LoggerStyle;
      info: LoggerStyle;
      warn: LoggerStyle;
      error: LoggerStyle;
    };
  };
}

export interface ILoggerHistory {
  datetime: DateTime;
  group: string[];
  severity: LoggerSeverity;
  logs: any[];
}

export class Logger {
  private static readonly _configs = new Map<string, DeepPartial<ILoggerConfig>>();
  private static _historyLength = 0;

  public static get(group: string[] = []): Logger {
    return new Logger(group);
  }

  public static setConfig(group: string[], config: DeepPartial<ILoggerConfig>): void;
  public static setConfig(config: DeepPartial<ILoggerConfig>): void;
  public static setConfig(arg1: string[] | DeepPartial<ILoggerConfig>, arg2?: DeepPartial<ILoggerConfig>): void {
    const group = (arg2 ? arg1 : []) as string[];
    const config = (arg2 ? arg2 : arg1) as DeepPartial<ILoggerConfig>;

    Logger._configs.set(group.join("_"), config);
  }

  public static restoreConfig(): void {
    Logger._configs.clear();
  }

  public static setHistoryLength(len: number): void {
    Logger._historyLength = len;
  }

  public static history: ILoggerHistory[] = [];

  private constructor(private readonly _group: string[]) {
  }

  public log(...args: any[]): void {
    this._write(LoggerSeverity.log, args);
  }

  public info(...args: any[]): void {
    this._write(LoggerSeverity.info, args);
  }

  public warn(...args: any[]): void {
    this._write(LoggerSeverity.warn, args);
  }

  public error(...args: any[]): void {
    this._write(LoggerSeverity.error, args);
  }

  private _write(severity: LoggerSeverity, logs: any[]): void {
    const config = this._getConfig();
    const now = new DateTime();

    const severityIndex = Object.values(LoggerSeverity).indexOf(severity);
    const consoleLevelIndex = Object.values(LoggerSeverity).indexOf(config.console.level);

    if (severityIndex >= consoleLevelIndex) {
      console.log(
        "%c" + now.toFormatString("yyyy-MM-dd HH:mm:ss.fff") + "\t" +
        (this._group.length > 0 ? "[" + this._group.join(".") + "]\t" : "") +
        "%c" + severity.toUpperCase().padStart(5, " ") + "%c" + "\t",
        LoggerStyle.fgGray,
        config.console.styles[severity],
        LoggerStyle.clear,
        ...logs
      );
    }

    if (Logger._historyLength > 0) {
      Logger.history.push({
        datetime: now,
        group: this._group,
        severity,
        logs
      });

      while (Logger.history.length > Logger._historyLength) {
        Logger.history.remove(Logger.history[0]);
      }
    }
  }

  private _getConfig(): ILoggerConfig {
    let config: ILoggerConfig = {
      console: {
        level: LoggerSeverity.log,
        styles: {
          log: LoggerStyle.clear,
          info: LoggerStyle.fgCyan,
          warn: LoggerStyle.fgYellow,
          error: LoggerStyle.fgRed
        }
      }
    };

    const currGroup: string[] = [];
    config = ObjectUtil.merge(config, Logger._configs.get(currGroup.join("_")));
    for (const groupItem of this._group) {
      currGroup.push(groupItem);

      if (Logger._configs.has(currGroup.join("_"))) {
        config = ObjectUtil.merge(config, Logger._configs.get(currGroup.join("_")));
      }
    }

    return config;
  }
}