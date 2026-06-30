import { tmpdir } from "node:os";
import { join } from "node:path";

export async function readStdinJson(): Promise<unknown> {
  if (process.stdin.isTTY) return undefined;

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text ? (JSON.parse(text) as unknown) : undefined;
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function getSessionId(data: unknown): string {
  const sessionId = asRecord(data)?.["session_id"];
  return typeof sessionId === "string" && sessionId ? sessionId : "unknown";
}

export function getCwd(data: unknown): string {
  const cwd = asRecord(data)?.["cwd"];
  return typeof cwd === "string" && cwd ? cwd : process.cwd();
}

export function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function readHashDir(sessionId: string): string {
  return join(tmpdir(), "tmp", "read_hash", sessionId);
}
