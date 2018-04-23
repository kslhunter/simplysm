import * as path from "path";
import * as fs from "fs-extra";
import {DateOnly} from "../types/DateOnly";

export type LoggerTypeString = "log" | "info" | "warn" | "error";

export interface ILoggerConfig {
    console: LoggerTypeString[];
    file: LoggerTypeString[];
    filePath: string | undefined;
    historyLength: number;
}

export interface ILoggerHistory {
    loggerId: number;
    loggedAtDateTime: Date;
    loggerName: string;
    logType: string;
    logs: any[];
}

export class Logger {
    static config: ILoggerConfig = {
        console: ["log", "info", "warn", "error"],
        file: [],
        filePath: undefined,
        historyLength: 30
    };
    static history: ILoggerHistory[] = [];
    static _lastId = 0;

    private readonly _id: number;
    private readonly _name: string;

    constructor(name: string) {
        this._name = name;
        this._id = Logger._lastId + 1;
    }

    log(...logs: any[]): void {
        this._write("log", logs);
    }

    info(...logs: any[]): void {
        this._write("info", logs);
    }

    warn(...logs: any[]): void {
        this._write("warn", logs);
    }

    error(...logs: any[]): void {
        this._write("error", logs);
    }

    private _write(type: LoggerTypeString, logs: any[]): void {
        //-- 로그이력 등록
        Logger.history.push({
            loggerId: this._id,
            loggedAtDateTime: new Date(),
            loggerName: this._name,
            logType: type,
            logs: logs
        });

        //-- 로그를 문자열로 변환
        const logStrings = logs.map(log => {
            //-- 색상있으면 색상 빼기
            if (typeof log === "string") {
                return log.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
            }

            //-- 에러는 스택만 추출
            else if (log instanceof Error) {
                return log.stack;
            }

            //-- 객체는 JSON으로 stringify
            /*else if (typeof log === "object") {
                return JsonConvert.stringify(log, {space: 2});
            }*/

            return log;
        });

        //-- 로그 콘솔 출력
        if (Logger.config.console.includes(type)) {
            let text = `[%c${new Date().toFormatString("yyMMdd HH:mm:ss.fff")}%c] `;
            text += `[%c${this._id.toString().padStart(4, "0")}%c] `;
            text += `[%c${this._name}%c] %c%s%c`;

            //-- Node.js
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
                    `\x1b[${colors.warn}m`,
                    `\x1b[0m`,
                    `\x1b[${colors[type]}m`,
                    logStrings[0],
                    "\x1b[0m"
                ].concat(logStrings.slice(1)));
            }

            //-- Browser
            else {
                const colors = {
                    log: "black",
                    info: "#2196F3",
                    warn: "#FF9800",
                    error: "#F44336"
                };

                // eslint-disable-next-line no-console
                console.log.apply(console, [
                    text,
                    `color: grey;`,
                    `color: black;`,
                    `color: grey;`,
                    `color: black;`,
                    `\x1b[${colors.warn}m`,
                    `\x1b[0m`,
                    `color: ${colors[type]};`,
                    logStrings[0],
                    "color: black;"
                ].concat(logStrings.slice(1)));
            }
        }

        //-- 로그 파일 출력
        if (Logger.config.file.includes(type)) {
            if (!process.versions.node) {
                throw new Error("웹에서는 파일 로그를 사용할 수 없습니다.");
            }

            Logger.config.filePath = Logger.config.filePath || path.resolve(process.cwd(), "logs");

            let text = `[${type.toUpperCase().padEnd(5, " ")}] `;
            text += `[${new Date().toFormatString("yyMMdd HH:mm:ss.fff")}] `;
            text += `[${this._id.toString().padStart(4, "0")}] `;
            text += `[${this._name}] ${logStrings.join("\n")}`;

            try {
                fs.mkdirsSync(Logger.config.filePath);
                const filePath = path.resolve(
                    Logger.config.filePath,
                    "logs-" + new DateOnly().toFormatString("yyyyMMdd") + ".log"
                );

                if (fs.existsSync(filePath)) {
                    fs.appendFileSync(filePath, text + "\r\n", "utf8");
                }
                else {
                    fs.writeFileSync(filePath, text + "\r\n", "utf8");
                }
            }
            catch (e) {
                console.error(e);
                throw e;
            }
        }
    }
}