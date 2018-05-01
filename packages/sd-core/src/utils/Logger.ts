import * as fs from "fs-extra";
import * as path from "path";

export class Logger {
    public static history: ILoggerHistory[] = [];

    public static setGroupConfig(groupName?: string, config?: Partial<ILoggerConfig>): void {
        if (groupName) {
            if (this._groupMap.has(groupName)) {
                const prev = this._groupMap.get(groupName);
                this._groupMap.set(groupName, {
                    ...prev!,
                    ...config
                });
            }
            else {
                this._groupMap.set(groupName, {
                    consoleLogTypes: ["log", "info", "warn", "error"],
                    fileLogTypes: [],
                    outputPath: undefined,
                    historySize: 30,
                    ...config
                });
            }
        }
        else {
            for (const key of Array.from(this._groupMap.keys())) {
                this.setGroupConfig(key, config);
            }
        }
    }

    public static setDefaultConfig(config: Partial<ILoggerConfig>): void {
        this._defaultConfig = {
            ...this._defaultConfig,
            ...config
        };
    }

    private static _defaultConfig: ILoggerConfig = {
        consoleLogTypes: ["log", "info", "warn", "error"],
        fileLogTypes: [],
        outputPath: undefined,
        historySize: 30
    };

    private static _groupMap = new Map<string, ILoggerConfig>();
    private static _lastId = 0;

    private readonly _groupName: string;
    private readonly _name: string;
    private readonly _id: number;

    public constructor(groupName: string, name: string | object) {
        this._groupName = groupName;
        this._name = typeof name === "string" ? name : name.constructor.name;

        Logger._lastId++;
        this._id = Logger._lastId;
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

    private _write(type: LoggerTypeString, logs: any[]): void {
        const now = new Date();

        // 설정 가져오기
        const config = (this._groupName && Logger._groupMap.get(this._groupName)) || Logger._defaultConfig;

        // 로그이력 등록
        Logger.history.push({
            groupName: this._groupName,
            loggerName: this._name,
            loggerId: this._id,
            logType: type,
            logs,
            loggedAtDateTime: now
        });
        Logger.history = Logger.history.slice(0, config.historySize);

        // 로그 변환
        const convertedLogs = logs.map((log) => {
            // 색상있으면 색상 빼기
            if (typeof log === "string") {
                return log.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
            }

            // 에러는 스택만 추출
            else if (log instanceof Error) {
                return log.stack;
            }

            return log;
        });

        // 콘솔 출력
        if (config.consoleLogTypes.includes(type)) {
            let text = `[%c${now.toFormatString("yyMMdd HH:mm:ss.fff")}%c] `;
            text += `[%c${this._id.toString().padStart(4, "0")}%c] `;
            text += `[%c${this._groupName}%c] `;
            text += `[%c${this._name}%c] %c%s%c`;

            // Node.js
            if (process.versions.node) {
                const colors = {
                    log: 0,
                    info: 36,
                    warn: 33,
                    error: 31
                };

                console.log.apply(console, [
                    text.replace(/%c/g, "%s"),
                    `\x1b[90m`,
                    `\x1b[0m`,
                    `\x1b[90m`,
                    `\x1b[0m`,
                    `\x1b[0m`,
                    `\x1b[0m`,
                    `\x1b[${colors.warn}m`,
                    `\x1b[0m`,
                    `\x1b[${colors[type]}m`,
                    convertedLogs[0],
                    "\x1b[0m"
                ].concat(convertedLogs.slice(1)));
            }

            // Browser
            else {
                const colors = {
                    log: "black",
                    info: "#2196F3",
                    warn: "#FF9800",
                    error: "#F44336"
                };

                console.log.apply(console, [
                    text,
                    `color: grey;`,
                    `color: black;`,
                    `color: grey;`,
                    `color: black;`,
                    `color: black;`,
                    `color: black;`,
                    `\x1b[${colors.warn}m`,
                    `\x1b[0m`,
                    `color: ${colors[type]};`,
                    convertedLogs[0],
                    "color: black;"
                ].concat(convertedLogs.slice(1)));
            }
        }

        // 로그 파일 출력
        if (config.fileLogTypes.includes(type)) {
            if (!process.versions.node) {
                throw new Error("웹에서는 파일 로그를 사용할 수 없습니다.");
            }

            config.outputPath = config.outputPath || path.resolve(process.cwd(), "logs");

            let text = `[${type.toUpperCase().padEnd(5, " ")}] `;
            text += `[${now.toFormatString("yyMMdd HH:mm:ss.fff")}] `;
            text += `[${this._id.toString().padStart(4, "0")}] `;
            text += `[${this._groupName}: ${this._name}] ${convertedLogs.join("\n")}`;

            try {
                fs.mkdirsSync(config.outputPath);
                const filePath = path.resolve(
                    config.outputPath,
                    `logs-${new Date().toFormatString("yyyyMMdd")}.log`
                );

                if (fs.existsSync(filePath)) {
                    fs.appendFileSync(filePath, `${text}\r\n`, "utf8");
                }
                else {
                    fs.writeFileSync(filePath, `${text}\r\n`, "utf8");
                }
            } catch (e) {
                console.error(e);
                throw e;
            }
        }
    }
}

export interface ILoggerConfig {
    consoleLogTypes: LoggerTypeString[];
    fileLogTypes: LoggerTypeString[];
    outputPath: string | undefined;
    historySize: number;
}

export interface ILoggerHistory {
    groupName: string | undefined;
    loggerName: string | undefined;
    loggerId: number;
    logType: LoggerTypeString;
    logs: any[];
    loggedAtDateTime: Date;
}

export type LoggerTypeString = "log" | "info" | "warn" | "error";