import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access, readFile, realpath, stat } from "node:fs/promises";
import { normalize, resolve } from "node:path";

export function hashBuffer(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export function hashText(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function pathHash(filePath: string): string {
  return hashText(normalize(filePath));
}

export async function fileHash(filePath: string): Promise<string> {
  return hashBuffer(await readFile(filePath));
}

export async function isRegularFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function resolveFileKey(filePath: string): Promise<string> {
  const resolved = resolve(filePath);
  try {
    return await realpath(resolved);
  } catch {
    return resolved;
  }
}

export function shortHash(hash: string): string {
  return hash.slice(0, 12);
}
