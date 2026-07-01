import { homedir } from "node:os";
import { join } from "node:path";

// CLI·hook·확장이 공유하는 leaf 유틸 — 다른 모듈을 import 하지 않는 단방향 싱크.

export function defaultDataDir(): string {
  return join(homedir(), ".claude", "sd");
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readStdinJsonRecord(): Promise<Record<string, unknown> | undefined> {
  if (process.stdin.isTTY) return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return undefined;
  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

export function decodeUtf8Strict(data: Buffer | Uint8Array | ArrayBuffer): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(data);
}

export function isFileReadError(error: unknown): boolean {
  return isRecord(error) && typeof error["code"] === "string";
}
