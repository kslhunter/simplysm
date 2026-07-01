import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  asRecord,
  formatErrorMessage,
  getSessionId,
  readHashDir,
  readStdinJson,
} from "../shared/hook-io.ts";
import { fileHash, isRegularFile, pathHash } from "../shared/write-hash.ts";

class WriteHashViolationError extends Error {}

async function main(): Promise<void> {
  try {
    const data = await readStdinJson();
    const filePath = getFilePath(data);
    if (!filePath || !(await isRegularFile(filePath))) return;

    const cachePath = join(readHashDir(getSessionId(data)), pathHash(filePath));
    const cachedHash = await readCachedHash(cachePath);
    const currentHash = await fileHash(filePath);

    if (cachedHash !== currentHash) {
      throw new WriteHashViolationError(
        `CRITICAL: File content has changed or was never Read. You MUST Read the file first, then MUST REVISE your Write content based on the current file content before retrying: ${filePath}`,
      );
    }
  } catch (error) {
    if (error instanceof WriteHashViolationError) {
      console.error(formatErrorMessage(error));
    } else {
      console.error(
        `Blocked: check-write guard failed (${formatErrorMessage(error)}). Read the file first, then retry.`,
      );
    }
    process.exit(2);
  }
}

async function readCachedHash(cachePath: string): Promise<string> {
  try {
    return (await readFile(cachePath, "utf8")).trim();
  } catch {
    return "";
  }
}

function getFilePath(data: unknown): string {
  const filePath = asRecord(asRecord(data)?.["tool_input"])?.["file_path"];
  return typeof filePath === "string" ? filePath : "";
}

await main();
