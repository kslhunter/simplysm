import {DateTime} from "../type/DateTime";

export class Logger {
  public static history: ILoggerHistory[] = [];
  private static readonly _groupMap = new Map<string, ILoggerConfig>();
  private static _lastId = 0;

  private static _defaultConfig: ILoggerConfig = {
    consoleLogSeverities: ["log", "info", "warn", "error"],
    fileLogSeverities: [],
    outputPath: undefined,
    historySize: 30,
    color: !process.versions.node
      ? {
        grey: "color: grey;",
        log: "color: black;",
        info: "color: #2196F3;",
        warn: "color: #FF9800;",
        error: "color: #F44336;"
      }
      : {
        grey: "\x1b[90m",
        log: "\x1b[0m",
        info: "\x1b[36m",
        warn: "\x1b[33m",
        error: "\x1b[31m"
      }
  };

  public readonly id: number;

  public constructor(private readonly _groupName: string,
                     private readonly _name: string,
                     private readonly _prefix?: string) {
    Logger._lastId++;
    this.id = Logger._lastId;
  }

  public static setDefaultConfig(config: Partial<ILoggerConfig>): void {
    this._defaultConfig = {
      ...this._defaultConfig,
      ...config
    };
  }

  public static restoreDefaultConfig(): void {
    this._defaultConfig = {
      consoleLogSeverities: ["log", "info", "warn", "error"],
      fileLogSeverities: [],
      outputPath: undefined,
      historySize: 30,
      color: !process.versions.node
        ? {
          grey: "color: grey;",
          log: "color: black;",
          info: "color: #2196F3;",
          warn: "color: #FF9800;",
          error: "color: #F44336;"
        }
        : {
          grey: "\x1b[90m",
          log: "\x1b[0m",
          info: "\x1b[36m",
          warn: "\x1b[33m",
          error: "\x1b[31m"
        }
    };
  }

  public static setGroupConfig(groupName: string, config: Partial<ILoggerConfig>): void {
    if (this._groupMap.has(groupName)) {
      const prevConfig = this._groupMap.get(groupName)!;
      this._groupMap.set(groupName, {
        ...prevConfig,
        ...config
      });
    }
    else {
      this._groupMap.set(groupName, {
        ...Logger._defaultConfig,
        ...config
      });
    }
  }

  public static restoreGroupConfig(groupName?: string): void {
    if (groupName) {
      this._groupMap.delete(groupName);
    }
    else {
      this._groupMap.clear();
    }
  }

  public get config(): ILoggerConfig {
    return (this._groupName && Logger._groupMap.get(this._groupName)) || Logger._defaultConfig;
  }

  public log(...logs: any[]): void {
    this._write("log", logs);
  }

  public info(...logs: any[]): void {
    this._write("info", logs);
  }

  public warn(...logs: any[]): void {
    this._write("warn", logs);
  }

  public error(...logs: any[]): void {
    this._write("error", logs);
  }

  private _write(severity: LoggerSeverityString, logs: any[]): void {
    const now = new DateTime();

    // 로그이력 등록
    Logger.history.push({
      groupName: this._groupName,
      loggerId: this.id,
      loggerName: this._name,
      severity,
      prefix: this._prefix,
      messages: logs,
      loggedAtDateTime: now
    });
    Logger.history = Logger.history.slice(-this.config.historySize);

    // 로그 변환
    const convertedLogs = logs.map(item => {
      // 색상있으면 색상 빼기
      if (typeof item === "string") {
        return item.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
      }
      else if (item instanceof Error) {
        return item.stack;
      }

      return item;
    });

    const log = {
      id: this.id.toString(),
      now: now.toFormatString("yyMMdd HH:mm:ss.fff"),
      group: this._groupName,
      name: this._name,
      severity: severity.toUpperCase(),
      prefix: this._prefix
    };

    const text = `${this.config.color.grey}[${log.id.toString().padStart(3, "0")}] ${log.now} - ${log.group} - ${log.name} - ${this.config.color[severity]}${log.severity}: ${log.prefix ? log.prefix + " " : ""}${convertedLogs.join("\r\n")}${this.config.color.log}`;

    // 콘솔 출력
    if (this.config.consoleLogSeverities.includes(severity)) {
      console.log(text);
    }

    // 파일 출력
    if (this.config.fileLogSeverities.includes(severity)) {
      const path = eval("require('path')"); //tslint:disable-line:no-eval
      const fs = eval("require('fs')"); //tslint:disable-line:no-eval

      const outputPath = this.config.outputPath || path.resolve(process.cwd(), "logs");
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath);
      }

      const filePath = path.resolve(outputPath, `${now.toFormatString("yyyyMMdd-HH")}.log`);
      if (fs.existsSync(filePath)) {
        fs.appendFileSync(filePath, `${text}\r\n`, "utf8");
      }
      else {
        fs.writeFileSync(filePath, `${text}\r\n`, "utf8");
      }
    }
  }
}

export interface ILoggerConfig {
  consoleLogSeverities: LoggerSeverityString[];
  fileLogSeverities: LoggerSeverityString[];
  outputPath: string | undefined;
  historySize: number;
  color: ILogColor;
}

export interface ILoggerHistory {
  groupName: string | undefined;
  loggerId: number;
  loggerName: string | undefined;
  severity: LoggerSeverityString;
  prefix: string | undefined;
  messages: any[];
  loggedAtDateTime: DateTime;
}

export interface ILogColor {
  grey: string;
  log: string;
  info: string;
  warn: string;
  error: string;
}

export type LoggerSeverityString = "log" | "info" | "warn" | "error";
