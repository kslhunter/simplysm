import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
    console.error(formatErrorMessage(error));
    process.exit(error instanceof WriteHashViolationError ? 2 : 1);
  }
}

function readHashDir(sessionId: string): string {
  return join(tmpdir(), "tmp", "read_hash", sessionId);
}

async function readCachedHash(cachePath: string): Promise<string> {
  try {
    return (await readFile(cachePath, "utf8")).trim();
  } catch {
    return "";
  }
}

async function readStdinJson(): Promise<unknown> {
  if (process.stdin.isTTY) return undefined;

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text ? (JSON.parse(text) as unknown) : undefined;
}

function getFilePath(data: unknown): string {
  const filePath = asRecord(asRecord(data)?.["tool_input"])?.["file_path"];
  return typeof filePath === "string" ? filePath : "";
}

function getSessionId(data: unknown): string {
  const sessionId = asRecord(data)?.["session_id"];
  return typeof sessionId === "string" && sessionId ? sessionId : "unknown";
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

await main();
