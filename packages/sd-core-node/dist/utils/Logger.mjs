import { DateTime, MathUtil, ObjectUtil } from "@simplysm/sd-core-common";
import * as path from "path";
import { FsUtil } from "./FsUtil";
import * as os from "os";
export var LoggerStyle;
(function (LoggerStyle) {
    LoggerStyle["clear"] = "\u001B[0m";
    LoggerStyle["fgGray"] = "\u001B[90m";
    LoggerStyle["fgBlack"] = "\u001B[30m";
    LoggerStyle["fgWhite"] = "\u001B[37m";
    LoggerStyle["fgRed"] = "\u001B[31m";
    LoggerStyle["fgGreen"] = "\u001B[32m";
    LoggerStyle["fgYellow"] = "\u001B[33m";
    LoggerStyle["fgBlue"] = "\u001B[34m";
    LoggerStyle["fgMagenta"] = "\u001B[35m";
    LoggerStyle["fgCyan"] = "\u001B[36m";
    LoggerStyle["bgBlack"] = "\u001B[40m\u001B[97m";
    LoggerStyle["bgRed"] = "\u001B[41m\u001B[97m";
    LoggerStyle["bgGreen"] = "\u001B[42m\u001B[97m";
    LoggerStyle["bgYellow"] = "\u001B[43m\u001B[97m";
    LoggerStyle["bgBlue"] = "\u001B[44m\u001B[97m";
    LoggerStyle["bgMagenta"] = "\u001B[45m\u001B[97m";
    LoggerStyle["bgWhite"] = "\u001B[46m\u001B[97m";
})(LoggerStyle || (LoggerStyle = {}));
export var LoggerSeverity;
(function (LoggerSeverity) {
    LoggerSeverity["debug"] = "debug";
    LoggerSeverity["log"] = "log";
    LoggerSeverity["info"] = "info";
    LoggerSeverity["warn"] = "warn";
    LoggerSeverity["error"] = "error";
    LoggerSeverity["none"] = "";
})(LoggerSeverity || (LoggerSeverity = {}));
export class Logger {
    constructor(_group) {
        this._group = _group;
        this._randomForStyle = MathUtil.getRandomInt(4, 9);
    }
    static get(group = []) {
        return new Logger(group);
    }
    static setConfig(arg1, arg2) {
        const group = (arg2 !== undefined ? arg1 : []);
        const config = (arg2 !== undefined ? arg2 : arg1);
        Logger.configs.set(group.join("_"), config);
    }
    static restoreConfig() {
        Logger.configs.clear();
    }
    static setHistoryLength(len) {
        Logger._historyLength = len;
    }
    debug(...args) {
        this._write(LoggerSeverity.debug, args);
    }
    log(...args) {
        this._write(LoggerSeverity.log, args);
    }
    info(...args) {
        this._write(LoggerSeverity.info, args);
    }
    warn(...args) {
        this._write(LoggerSeverity.warn, args);
    }
    error(...args) {
        this._write(LoggerSeverity.error, args);
    }
    _write(severity, logs) {
        const config = this._getConfig();
        const now = new DateTime();
        const severityIndex = Object.values(LoggerSeverity).indexOf(severity);
        const consoleLevelIndex = Object.values(LoggerSeverity).indexOf(config.console.level);
        const fileLevelIndex = Object.values(LoggerSeverity).indexOf(config.file.level);
        if (severityIndex >= consoleLevelIndex) {
            if (typeof process.stdout.clearLine === "function") {
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
            }
            // eslint-disable-next-line no-console
            console.log(LoggerStyle.fgGray + now.toFormatString("yyyy-MM-dd HH:mm:ss.fff") + " "
                + (this._group.length > 0 ? config.console.style + "[" + this._group.join(".") + "] " : "")
                + config.console.styles[severity] + severity.toUpperCase().padStart(5, " "), ...logs.map((log) => ((log instanceof Error && log.stack !== undefined) ? log.stack : log)), LoggerStyle.clear);
        }
        else if (config.dot) {
            process.stdout.write(".");
        }
        if (severityIndex >= fileLevelIndex) {
            let text = now.toFormatString("yyyy-MM-dd HH:mm:ss.fff") + " ";
            text += (this._group.length > 0 ? "[" + this._group.join(".") + "] " : "");
            text += severity.toUpperCase().padStart(5, " ") + os.EOL;
            for (const log of logs) {
                let convertedLog = log;
                // 색상빼기
                if (typeof convertedLog === "string") {
                    convertedLog = convertedLog.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
                }
                else if (typeof convertedLog.toString === "function" && !(/^\[.*]$/).test(convertedLog.toString())) {
                    convertedLog = convertedLog.toString();
                }
                else {
                    convertedLog = JSON.stringify(convertedLog);
                }
                text += convertedLog + os.EOL;
            }
            const outPath = path.resolve(config.file.outDir, now.toFormatString("yyyyMMdd"));
            FsUtil.mkdirs(outPath);
            const fileNames = FsUtil.readdir(outPath);
            const lastFileSeq = fileNames
                .filter((fileName) => fileName.endsWith(".log"))
                .map((fileName) => Number(path.basename(fileName, path.extname(fileName))))
                .filter((item) => !Number.isNaN(item))
                .max();
            let logFileName = "1.log";
            if (lastFileSeq !== undefined) {
                const lstat = FsUtil.lstat(path.resolve(outPath, lastFileSeq + ".log"));
                if (lstat.size > (config.file.maxBytes ?? 500 * 1000)) {
                    logFileName = (lastFileSeq + 1).toString() + ".log";
                }
                else {
                    logFileName = lastFileSeq + ".log";
                }
            }
            const logFilePath = path.resolve(outPath, logFileName);
            if (FsUtil.exists(logFilePath)) {
                FsUtil.appendFile(logFilePath, text);
            }
            else {
                FsUtil.writeFile(logFilePath, text);
            }
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
    _getConfig() {
        let config = {
            dot: false,
            console: {
                style: LoggerStyle[Object.keys(LoggerStyle)[this._randomForStyle]],
                level: LoggerSeverity.log,
                styles: {
                    debug: LoggerStyle.fgGray,
                    log: LoggerStyle.clear,
                    info: LoggerStyle.fgCyan,
                    warn: LoggerStyle.fgYellow,
                    error: LoggerStyle.fgRed
                }
            },
            file: {
                level: LoggerSeverity.none,
                outDir: path.resolve(process.cwd(), "_logs"),
                maxBytes: 300 * 1000
            }
        };
        const currGroup = [];
        config = ObjectUtil.merge(config, Logger.configs.get(currGroup.join("_")));
        for (const groupItem of this._group) {
            currGroup.push(groupItem);
            if (Logger.configs.has(currGroup.join("_"))) {
                config = ObjectUtil.merge(config, Logger.configs.get(currGroup.join("_")));
            }
        }
        return config;
    }
}
Logger.configs = new Map();
Logger._historyLength = 0;
Logger.history = [];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL0xvZ2dlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsUUFBUSxFQUFlLFFBQVEsRUFBRSxVQUFVLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN2RixPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUM3QixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ2xDLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBRXpCLE1BQU0sQ0FBTixJQUFZLFdBcUJYO0FBckJELFdBQVksV0FBVztJQUNyQixrQ0FBaUIsQ0FBQTtJQUVqQixvQ0FBbUIsQ0FBQTtJQUNuQixxQ0FBb0IsQ0FBQTtJQUNwQixxQ0FBb0IsQ0FBQTtJQUVwQixtQ0FBa0IsQ0FBQTtJQUNsQixxQ0FBb0IsQ0FBQTtJQUNwQixzQ0FBcUIsQ0FBQTtJQUNyQixvQ0FBbUIsQ0FBQTtJQUNuQix1Q0FBc0IsQ0FBQTtJQUN0QixvQ0FBbUIsQ0FBQTtJQUVuQiwrQ0FBNEIsQ0FBQTtJQUM1Qiw2Q0FBMEIsQ0FBQTtJQUMxQiwrQ0FBNEIsQ0FBQTtJQUM1QixnREFBNkIsQ0FBQTtJQUM3Qiw4Q0FBMkIsQ0FBQTtJQUMzQixpREFBOEIsQ0FBQTtJQUM5QiwrQ0FBNEIsQ0FBQTtBQUM5QixDQUFDLEVBckJXLFdBQVcsS0FBWCxXQUFXLFFBcUJ0QjtBQUVELE1BQU0sQ0FBTixJQUFZLGNBT1g7QUFQRCxXQUFZLGNBQWM7SUFDeEIsaUNBQWUsQ0FBQTtJQUNmLDZCQUFXLENBQUE7SUFDWCwrQkFBYSxDQUFBO0lBQ2IsK0JBQWEsQ0FBQTtJQUNiLGlDQUFlLENBQUE7SUFDZiwyQkFBUyxDQUFBO0FBQ1gsQ0FBQyxFQVBXLGNBQWMsS0FBZCxjQUFjLFFBT3pCO0FBK0JELE1BQU0sT0FBTyxNQUFNO0lBOEJqQixZQUFxQyxNQUFnQjtRQUFoQixXQUFNLEdB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