import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileHash, isRegularFile, pathHash } from "../shared/write-hash.ts";

async function main(): Promise<void> {
  const data = await readStdinJson();
  const filePath = getFilePath(data);
  if (!filePath || !(await isRegularFile(filePath))) return;

  const cacheDir = readHashDir(getSessionId(data));
  await mkdir(cacheDir, { recursive: true });
  await writeFile(join(cacheDir, pathHash(filePath)), await fileHash(filePath), "utf8");
}

function readHashDir(sessionId: string): string {
  return join(tmpdir(), "tmp", "read_hash", sessionId);
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

await main();
