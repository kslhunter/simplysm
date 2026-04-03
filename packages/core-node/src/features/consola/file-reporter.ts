import type { ConsolaOptions, ConsolaReporter, LogObject } from "consola";
import fs from "fs";
import path from "path";

export interface FileReporterOptions {
  /** @default 20MB */
  maxSize?: number;
  /** @default 14 */
  maxDays?: number;
}

const DEFAULT_MAX_SIZE = 20 * 1024 * 1024;
const DEFAULT_MAX_DAYS = 14;

export function createFileReporter(options?: FileReporterOptions): ConsolaReporter {
  const maxSize = options?.maxSize ?? DEFAULT_MAX_SIZE;
  const maxDays = options?.maxDays ?? DEFAULT_MAX_DAYS;
  const outDir = path.resolve(process.cwd(), ".logs");

  let dirEnsured = false;
  let stream: fs.WriteStream | null = null;
  let currentDate = "";
  let currentSize = 0;
  let lastCleanDate = "";

  function rotate(dateStr: string): void {
    if (stream != null) {
      stream.end();
      stream = null;
    }

    if (!dirEnsured) {
      fs.mkdirSync(outDir, { recursive: true });
      dirEnsured = true;
    }

    const filePath = resolveLogFilePath(outDir, dateStr, maxSize);
    try {
      currentSize = fs.statSync(filePath).size;
    } catch {
      currentSize = 0;
    }

    stream = fs.createWriteStream(filePath, { flags: "a" });
    currentDate = dateStr;
  }

  return {
    log(logObj: LogObject, _ctx: { options: ConsolaOptions }) {
      const entry: Record<string, unknown> = {
        time: logObj.date.toISOString(),
        level: logObj.type.toUpperCase(),
      };
      if (logObj.tag) {
        entry["tag"] = logObj.tag;
      }

      const msgs: string[] = [];
      for (const a of logObj.args) {
        if (a instanceof Error) {
          entry["err"] = { message: a.message, stack: a.stack };
        } else {
          msgs.push(typeof a === "string" ? a : String(a));
        }
      }
      if (msgs.length > 0) {
        entry["msg"] = msgs.join(" ");
      }

      const line = JSON.stringify(entry) + "\n";

      const date = logObj.date;
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

      if (dateStr !== currentDate || currentSize + line.length >= maxSize) {
        rotate(dateStr);
      }

      stream!.write(line);
      currentSize += line.length;

      if (lastCleanDate !== dateStr) {
        lastCleanDate = dateStr;
        cleanOldFiles(outDir, maxDays);
      }
    },
  };
}

function resolveLogFilePath(outDir: string, dateStr: string, maxSize: number): string {
  const basePath = path.join(outDir, `app.${dateStr}.log`);

  if (!fs.existsSync(basePath)) return basePath;
  if (fs.statSync(basePath).size < maxSize) return basePath;

  let seq = 1;
  while (true) {
    const seqPath = path.join(outDir, `app.${dateStr}.${seq}.log`);
    if (!fs.existsSync(seqPath)) return seqPath;
    if (fs.statSync(seqPath).size < maxSize) return seqPath;
    seq++;
  }
}

function cleanOldFiles(outDir: string, maxDays: number): void {
  let entries: string[];
  try {
    entries = fs.readdirSync(outDir);
  } catch {
    return;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxDays);
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;

  for (const entry of entries) {
    const match = /^app\.(\d{4}-\d{2}-\d{2})(?:\.\d+)?\.log$/.exec(entry);
    if (match != null && match[1] < cutoffStr) {
      try {
        fs.unlinkSync(path.join(outDir, entry));
      } catch {
        // ignore
      }
    }
  }
}
