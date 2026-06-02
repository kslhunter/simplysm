import type { ConsolaReporter, LogObject, ConsolaOptions } from "consola";
import { formatWithOptions } from "node:util";
import { sep } from "node:path";
import { env } from "@simplysm/core-common";

// -- Constants ----------------------------------------------------------------

const TYPE_ICONS: Record<string, string> = {
  error: "\u2716",
  fatal: "\u2716",
  ready: "\u2714",
  warn: "\u26A0",
  info: "\u2139",
  success: "\u2714",
  debug: "\u2699",
  trace: "\u2192",
  fail: "\u2716",
  start: "\u25D0",
  log: "",
};

type AnsiColor = "gray" | "red" | "green" | "yellow" | "cyan" | "magenta";

const TYPE_COLORS: Record<string, AnsiColor | undefined> = {
  info: "cyan",
  fail: "red",
  success: "green",
  ready: "green",
  start: "magenta",
};

const LEVEL_COLORS: Record<number, AnsiColor | undefined> = {
  0: "red",
  1: "yellow",
};

const ANSI_CODES: Record<AnsiColor, string> = {
  gray: "\x1b[90m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

const ANSI_RESET = "\x1b[0m";

// -- Helpers ------------------------------------------------------------------

function colorize(color: AnsiColor, text: string, enabled: boolean): string {
  if (!enabled) return text;
  return `${ANSI_CODES[color]}${text}${ANSI_RESET}`;
}

function writeStream(data: string, stream: NodeJS.WritableStream): void {
  const s = stream as NodeJS.WritableStream & { __write?: typeof stream.write };
  const write = s.__write ?? s.write;
  write.call(stream, data);
}

function detectColorSupport(): boolean {
  if (env("NO_COLOR") != null) return false;
  if (env("FORCE_COLOR") != null) return true;
  if (process.stdout.isTTY === true) return true;
  return process.platform === "win32";
}

// -- Reporter -----------------------------------------------------------------

interface FormatOpts {
  date?: boolean;
  colors: boolean;
  compact?: boolean | number;
  errorLevel?: number;
}

export class PrettyReporter implements ConsolaReporter {
  log(logObj: LogObject, ctx: { options: ConsolaOptions }): void {
    const opts: FormatOpts = {
      ...ctx.options.formatOptions,
      colors: detectColorSupport(),
    };

    const line = this._formatLogObj(logObj, opts);
    const stream =
      logObj.level < 2
        ? ctx.options.stderr ?? process.stderr
        : ctx.options.stdout ?? process.stdout;

    writeStream(line + "\n", stream);
  }

  /**
   * 색·날짜·뱃지 여백 없이 한 로그 엔트리를 평문(멀티라인 가능)으로 포맷.
   * 파일 reporter 등에서 콘솔과 동일한 표현(아이콘·tag·객체 inspect·스택)을 재사용하기 위한 진입점.
   * `formatOptions` 에 콘솔과 같은 `ctx.options.formatOptions` 를 넘기면 객체 펼침(compact) 등이 콘솔과 일치.
   */
  formatPlain(logObj: LogObject, formatOptions?: Partial<FormatOpts>): string {
    return this._formatLogObj(logObj, { ...formatOptions, colors: false, date: false }).trim();
  }

  private _formatLogObj(logObj: LogObject, opts: FormatOpts): string {
    const formattedArgs = this._formatArgs(logObj.args, opts);
    const [message, ...additional] = formattedArgs.split("\n");

    if (logObj.type === "box") {
      return this._formatBox(logObj, formattedArgs);
    }

    const tag = logObj.tag !== "" ? colorize("gray", `[${logObj.tag}]`, opts.colors) : "";
    const icon = this._formatIcon(logObj, opts.colors);
    const date = this._formatDate(logObj.date, opts);
    const coloredDate = date !== "" ? colorize("gray", date, opts.colors) : "";

    let fullLine = [tag, icon, message, coloredDate].filter(Boolean).join(" ");

    if (additional.length > 0) {
      fullLine += "\n" + additional.join("\n");
    }

    if (logObj.type === "trace") {
      const err = new Error("Trace: " + logObj.message);
      fullLine += this._formatStack(err.stack ?? "", err.message);
    }

    const isBadge = (logObj as LogObject & { badge?: boolean }).badge ?? logObj.level < 2;
    return isBadge ? "\n" + fullLine + "\n" : fullLine;
  }

  private _formatArgs(args: unknown[], opts: FormatOpts): string {
    const processed = args.map((arg) => {
      if (arg != null && typeof arg === "object" && typeof (arg as Error).stack === "string") {
        return this._formatError(arg as Error, opts);
      }
      return arg;
    });
    return formatWithOptions({ colors: opts.colors, compact: opts.compact }, ...processed);
  }

  private _formatError(err: Error, opts: FormatOpts): string {
    const message = err.message;
    const stack = err.stack != null ? this._formatStack(err.stack, message, opts) : "";
    const level = opts.errorLevel ?? 0;
    const prefix = level > 0 ? `${"  ".repeat(level)}[cause]: ` : "";
    const cause =
      err.cause instanceof Error
        ? "\n\n" + this._formatError(err.cause, { ...opts, errorLevel: level + 1 })
        : "";
    return prefix + message + "\n" + stack + cause;
  }

  private _formatStack(stack: string, message: string, opts?: FormatOpts): string {
    const cwd = process.cwd() + sep;
    const indent = "  ".repeat((opts?.errorLevel ?? 0) + 1);
    const lines = stack
      .split("\n")
      .splice(message.split("\n").length)
      .map((l) => l.trim().replace("file://", "").replace(cwd, ""));
    return `\n${indent}` + lines.map((l) => `  ${l}`).join(`\n${indent}`);
  }

  private _formatIcon(logObj: LogObject, useColors: boolean): string {
    const icon = TYPE_ICONS[logObj.type] ?? "";
    if (icon === "") return "";
    const color: AnsiColor = TYPE_COLORS[logObj.type] ?? LEVEL_COLORS[logObj.level] ?? "gray";
    return colorize(color, icon, useColors);
  }

  private _formatDate(date: Date, opts: FormatOpts): string {
    if (!opts.date) return "";
    const base = date.toLocaleTimeString();
    return `${base}.${String(date.getMilliseconds()).padStart(3, "0")}`;
  }

  private _formatBox(logObj: LogObject, message: string): string {
    const tag = logObj.tag !== "" ? `[${logObj.tag}]` : "";
    const title = (logObj as LogObject & { title?: string }).title;
    const lines = [tag, title, ...message.split("\n")].filter(Boolean);
    return "\n" + lines.map((l) => ` > ${l}`).join("\n") + "\n";
  }
}
