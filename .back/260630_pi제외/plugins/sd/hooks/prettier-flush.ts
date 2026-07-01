import { readdir, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import {
  asRecord,
  formatErrorMessage,
  getCwd,
  getSessionId,
  readStdinJson,
} from "../shared/hook-io.ts";
import {
  collectPluginsSdPrettierFiles,
  formatPrettierFailureMessage,
  getPrettierMarkerDir,
  type PrettierMarker,
  resolveWorkspaceRoot,
  runPrettier,
} from "../shared/prettier.ts";

interface PrettierMarkerRecord {
  markerPath: string;
  marker: PrettierMarker;
}

async function main(): Promise<void> {
  let data: unknown;

  try {
    data = await readStdinJson();
  } catch (error) {
    console.error(`plugins/sd prettier flush failed: ${formatErrorMessage(error)}`);
    process.exit(1);
  }

  try {
    const markerRecords = await readMarkers(getPrettierMarkerDir(getSessionId(data)));
    if (markerRecords.length === 0) return;

    const workspaceRoot = await resolveWorkspaceRoot({
      cwd: getCwd(data),
      projectDir: process.env["CLAUDE_PROJECT_DIR"],
    });
    if (!workspaceRoot) {
      writeStopFailure(data, "plugins/sd 자동 Prettier 실패: 프로젝트 루트를 찾지 못했습니다.");
      return;
    }

    const activeMarkerRecords: PrettierMarkerRecord[] = [];
    const staleMarkerRecords: PrettierMarkerRecord[] = [];
    const targetFileSet = new Set<string>();

    for (const markerRecord of markerRecords) {
      const markerTargetFiles = await collectPluginsSdPrettierFiles(
        workspaceRoot,
        [markerRecord.marker.filePath],
        { cwd: workspaceRoot },
      );

      if (markerTargetFiles.length === 0) {
        staleMarkerRecords.push(markerRecord);
        continue;
      }

      activeMarkerRecords.push(markerRecord);
      for (const filePath of markerTargetFiles) {
        targetFileSet.add(filePath);
      }
    }

    if (staleMarkerRecords.length > 0) {
      await cleanupMarkers(staleMarkerRecords);
    }

    const targetFiles = [...targetFileSet];
    if (targetFiles.length === 0) return;

    const result = await runPrettier(workspaceRoot, targetFiles);
    if (result.success) {
      await cleanupMarkers(activeMarkerRecords);
      return;
    }

    writeStopFailure(data, formatPrettierFailureMessage(result));
  } catch (error) {
    writeStopFailure(data, `plugins/sd 자동 Prettier 실패: ${formatErrorMessage(error)}`);
  }
}

async function readMarkers(markerDir: string): Promise<PrettierMarkerRecord[]> {
  let entryNames: string[];
  try {
    entryNames = await readdir(markerDir);
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") return [];
    throw error;
  }

  const markerRecords: PrettierMarkerRecord[] = [];
  for (const entryName of entryNames) {
    if (!entryName.endsWith(".json")) continue;

    const markerPath = join(markerDir, entryName);
    const marker = parseMarker(JSON.parse(await readFile(markerPath, "utf8")), markerPath);
    markerRecords.push({ markerPath, marker });
  }
  return markerRecords;
}

function parseMarker(payload: unknown, markerPath: string): PrettierMarker {
  const record = asRecord(payload);
  const workspaceRoot = record?.["workspaceRoot"];
  const filePath = record?.["filePath"];
  const createdAt = record?.["createdAt"];
  const toolName = record?.["toolName"];

  if (
    typeof workspaceRoot !== "string" ||
    typeof filePath !== "string" ||
    typeof createdAt !== "number" ||
    typeof toolName !== "string"
  ) {
    throw new Error(`잘못된 plugins/sd Prettier 대기 파일입니다: ${markerPath}`);
  }

  return { workspaceRoot, filePath, createdAt, toolName };
}

async function cleanupMarkers(markerRecords: readonly PrettierMarkerRecord[]): Promise<void> {
  await Promise.all(
    markerRecords.map(async (record) => {
      try {
        await unlink(record.markerPath);
      } catch (error) {
        if (!isErrnoException(error) || error.code !== "ENOENT") throw error;
      }
    }),
  );
}

function writeStopFailure(data: unknown, message: string): void {
  if (getStopHookActive(data)) {
    console.log(JSON.stringify({ systemMessage: message }));
    return;
  }

  console.log(JSON.stringify({ decision: "block", reason: message }));
}

function getStopHookActive(data: unknown): boolean {
  return asRecord(data)?.["stop_hook_active"] === true;
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

await main();
