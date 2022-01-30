import { DateTime, DeepPartial } from "@simplysm/sd-core-common";
export declare enum LoggerStyle {
    clear = "\u001B[0m",
    fgGray = "\u001B[90m",
    fgBlack = "\u001B[30m",
    fgWhite = "\u001B[37m",
    fgRed = "\u001B[31m",
    fgGreen = "\u001B[32m",
    fgYellow = "\u001B[33m",
    fgBlue = "\u001B[34m",
    fgMagenta = "\u001B[35m",
    fgCyan = "\u001B[36m",
    bgBlack = "\u001B[40m\u001B[97m",
    bgRed = "\u001B[41m\u001B[97m",
    bgGreen = "\u001B[42m\u001B[97m",
    bgYellow = "\u001B[43m\u001B[97m",
    bgBlue = "\u001B[44m\u001B[97m",
    bgMagenta = "\u001B[45m\u001B[97m",
    bgWhite = "\u001B[46m\u001B[97m"
}
export declare enum LoggerSeverity {
    debug = "debug",
    log = "log",
    info = "info",
    warn = "warn",
    error = "error",
    none = ""
}
export interface ILoggerConfig {
    dot: boolean;
    console: {
        style: LoggerStyle;
        level: LoggerSeverity;
        styles: {
            debug: LoggerStyle;
            log: LoggerStyle;
            info: LoggerStyle;
            warn: LoggerStyle;
            error: LoggerStyle;
        };
    };
    file: {
        level: LoggerSeverity;
        outDir: string;
        maxBytes?: number;
    };
}
export interface ILoggerHistory {
    datetime: DateTime;
    group: string[];
    severity: LoggerSeverity;
    logs: any[];
}
export declare class Logger {
    private readonly _group;
    static configs: Map<string, Partial<{
        dot: Partial<boolean>;
        console: Partial<{
            style: Partial<LoggerStyle>;
            level: Partial<LoggerSeverity>;
            styles: Partial<{
                debug: Partial<LoggerStyle>;
                log: Partial<LoggerStyle>;
                info: Partial<LoggerStyle>;
                warn: Partial<LoggerStyle>;
                error: Partial<LoggerStyle>;
            }>;
        }>;
        file: Partial<{
            level: Partial<LoggerSeverity>;
            outDir: string;
            maxBytes?: Partial<number | undefined>;
        }>;
    }>>;
    private static _historyLength;
    private readonly _randomForStyle;
    static get(group?: string[]): Logger;
    static setConfig(group: string[], config: DeepPartial<ILoggerConfig>): void;
    static setConfig(config: DeepPartial<ILoggerConfig>): void;
    static restoreConfig(): void;
    static setHistoryLength(len: number): void;
    static history: ILoggerHistory[];
    private constructor();
    debug(...args: any[]): void;
    log(...args: any[]): void;
    info(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
    private _write;
    private _getConfig;
}
