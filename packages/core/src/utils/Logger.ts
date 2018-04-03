import {DateOnly} from "../types/DateOnly";
import {Exception} from "../exceptions/Exception";

export class Logger {
    private static _lastLoggerId = 0;
    static history: {
        loggerId: number;
        now: Date;
        name: string;
        type: string;
        logs: any[];
    }[] = [];

    static getLogger(obj: object | string): Logger {
        return new Logger(obj, Logger._lastLoggerId++);
    }

    private _name: string;

    static config: {
        console: ("log" | "info" | "warn" | "error")[];
        file: ("log" | "info" | "warn" | "error")[];
        filePath?: string;
        historyLength: number;
    } = {
        console: ["log", "info", "warn", "error"],
        file: [],
        historyLength: 30
    };

    private constructor(obj: object | string, private _id: number) {
        this._name = (typeof obj === "string" ? obj : obj.constructor.name);
    }

    log(...args: any[]): void {
        this._write("log", args);
    }

    info(...args: any[]): void {
        this._write("info", args);
    }

    warn(...args: any[]): void {
        this._write("warn", args);
    }

    error(...args: any[]): void {
        this._write("error", args);
    }

    private _write(type: ("log" | "info" | "warn" | "error"), logs: any[]): void {
        logs = logs.map(item => {
            if (typeof item === "string") {
                return item.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
            }
            return item;
        });

        const obj = {
            loggerId: this._id,
            now: new Date(),
            name: this._name,
            type,
            logs
        };

        //-- 이력 등록
        Logger.history.insert(0, obj);
        Logger.history = Logger.history.slice(0, Logger.config.historyLength);

        //-- 로그 콘솔 출력
        if (Logger.config.console.includes(type)) {
            let text = "[%c" + obj.now.toFormatString("yyMMdd HH:mm:ss.fff") + "%c] ";
            text += "[%c" + obj.loggerId.toString().padStart(4, "0") + "%c] ";
            text += "%c" + obj.name.padEnd(25, " ") + ": %s%c";

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
                    `\x1b[${colors[type]}m`
                ].concat(obj.logs[0]).concat("\x1b[0m"));
            }
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
                    `color: ${colors[type]};`
                ].concat(obj.logs[0]).concat("color: black;"));
            }

            if (obj.logs[0] instanceof Error) {
                console.error(obj.logs[0].stack);
            }

            if (obj.logs.length > 1) {
                console.log.apply(console, obj.logs.slice(1));
            }
        }

        //-- 로그 파일 출력
        if (Logger.config.file.includes(type)) {
            if (!process.versions.node) {
                throw new Exception("웹에서는 파일 로그를 사용할 수 없습니다.");
            }

            let text = obj.type.toUpperCase().padEnd(5, " ") + ": ";
            text += "[" + obj.now.toFormatString("yyMMdd HH:mm:ss.fff") + "] ";
            text += "[" + obj.loggerId.toString().padStart(4, "0") + "] ";
            text += obj.name.padEnd(25, " ") + ": " + obj.logs.join(" ");

            const fs = require("fs-extra");
            const path = require("path");

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
            }
        }
    }
}
