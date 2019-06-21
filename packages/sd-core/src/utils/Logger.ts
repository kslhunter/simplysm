import {DateTime} from "../types/DateTime";
import * as path from "path";
import * as fs from "fs";

export class Logger {
  private static readonly _palletColors = !process.versions.node ? [
    "color: #827717;",
    "color: #388E3C;",
    "color: #1976D2;",
    "color: #AB47BC;",
    "color: #00838F;",
    "color: #F44336;"
  ] : [
    "\x1b[33m",
    "\x1b[32m",
    "\x1b[34m",
    "\x1b[35m",
    "\x1b[36m",
    "\x1b[31m"
  ];
  private static readonly _prefixColorMap = new Map<string, string>();

  public static history: ILoggerHistory[] = [];
  private static readonly _groupMap = new Map<string, ILoggerConfig>();
  private static _lastId = 0;

  private static _defaultConfig: ILoggerConfig = {
    consoleLogSeverities: ["log", "info", "warn", "error"], /*process.env.NODE_ENV === "production"
      ? []
      : ["log", "info", "warn", "error"],*/
    fileLogSeverities: process.env.NODE_ENV === "production"
      ? ["log", "info", "warn", "error"]
      : [],
    outputPath: process.env.NODE_ENV === "production" && process.versions.node ? "logs" : undefined,
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
                     private readonly _prefix?: string) {
    Logger._lastId++;
    this.id = Logger._lastId;
  }

  public static setDefaultConfig(config: Partial<ILoggerConfig>): void {
    Logger._defaultConfig = {
      ...Logger._defaultConfig,
      ...config
    };
  }

  public static restoreDefaultConfig(): void {
    Logger._defaultConfig = {
      consoleLogSeverities: process.env.NODE_ENV === "production"
        ? []
        : ["log", "info", "warn", "error"],
      fileLogSeverities: (process.env.NODE_ENV === "production" && process.versions.node)
        ? ["log", "info", "warn", "error"]
        : [],
      outputPath: process.env.NODE_ENV === "production" && process.versions.node ? "logs" : undefined,
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
    if (Logger._groupMap.has(groupName)) {
      const prevConfig = Logger._groupMap.get(groupName)!;
      Logger._groupMap.set(groupName, {
        ...prevConfig,
        ...config
      });
    }
    else {
      Logger._groupMap.set(groupName, {
        ...Logger._defaultConfig,
        ...config
      });
    }
  }

  public static restoreGroupConfig(groupName?: string): void {
    if (groupName) {
      Logger._groupMap.delete(groupName);
    }
    else {
      Logger._groupMap.clear();
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
    if (this._prefix && !Logger._prefixColorMap.has(this._prefix)) {
      Logger._prefixColorMap.set(
        this._prefix,
        Logger._palletColors[Array.from(Logger._prefixColorMap.keys()).length % Logger._palletColors.length]);
    }

    const now = new DateTime();
    const at = process.version ? new Error().stack!.match(/at .*/g)![2].trim() : undefined;

    // 로그이력 등록
    Logger.history.push({
      groupName: this._groupName,
      loggerId: this.id,
      at,
      severity,
      prefix: this._prefix,
      messages: logs,
      loggedAtDateTime: now
    });
    Logger.history = Logger.history.slice(-this.config.historySize);

    // 로그 변환
    let convertedLogs = logs.map(item => {
      if (item instanceof Error) {
        return item.stack;
      }

      // 색상있으면 색상 빼기
      if (typeof item === "string") {
        return item.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
      }

      return item;
    });

    const log = {
      id: this.id.toString(),
      now: now.toFormatString("yyyy-MM-dd HH:mm:ss.fff"),
      group: this._groupName,
      at,
      severity: severity.toUpperCase(),
      prefix: this._prefix
    };

    // 콘솔 출력
    if (this.config.consoleLogSeverities.includes(severity)) {
      const c = !process.versions.node ? "%c" : "%s";
      const logText = typeof convertedLogs[0] === "string" ? convertedLogs[0] : "";
      const logData = typeof convertedLogs[0] === "string" ? convertedLogs.slice(1) : convertedLogs;

      // const text = `${this.config.color.grey}[${log.now}] ${log.group}\t${this.config.color[severity]}${log.severity.padEnd(5, " ")}\t${log.prefix ? Logger._prefixColorMap.get(log.prefix) + log.prefix + " " : ""}${this.config.color.log}${convertedLogs.join("\r\n")}${this.config.color.log}`;
      const text = `${c}[${log.now}] ${log.group}\t${c}${log.severity.padEnd(5, " ")}\t${log.prefix ? c + log.prefix + "\t" : ""}${c}${logText}${c}`;

      // 콘솔 출력
      if (this.config.consoleLogSeverities.includes(severity)) {
        console.log(
          text,
          this.config.color.grey,
          this.config.color[severity],
          ...log.prefix ? [Logger._prefixColorMap.get(log.prefix)] : [],
          this.config.color.log,
          this.config.color.log,
          ...logData.mapMany(item => ["\r\n", item])
        );
      }
    }

    // 파일 출력
    if (this.config.fileLogSeverities.includes(severity)) {
      convertedLogs = logs.map(item => {
        // 색상있으면 색상 빼기
        if (typeof item === "string") {
          return item.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
        }

        return item;
      });

      let text = `${log.now} - [${log.severity}] - from ${log.group}`;
      text += log.at ? " - " + log.at : "";
      text += `\r\n${log.prefix ? log.prefix + " " : ""}${convertedLogs.join("\r\n")}\r\n`;

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
  at: string | undefined;
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
