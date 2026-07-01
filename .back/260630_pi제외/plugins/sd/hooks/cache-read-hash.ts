import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { asRecord, getSessionId, readHashDir, readStdinJson } from "../shared/hook-io.ts";
import { fileHash, isRegularFile, pathHash } from "../shared/write-hash.ts";

async function main(): Promise<void> {
  const data = await readStdinJson();
  const filePath = getFilePath(data);
  if (!filePath || !(await isRegularFile(filePath))) return;

  const cacheDir = readHashDir(getSessionId(data));
  await mkdir(cacheDir, { recursive: true });
  await writeFile(join(cacheDir, pathHash(filePath)), await fileHash(filePath), "utf8");
}

function getFilePath(data: unknown): string {
  const filePath = asRecord(asRecord(data)?.["tool_input"])?.["file_path"];
  return typeof filePath === "string" ? filePath : "";
}

await main();
