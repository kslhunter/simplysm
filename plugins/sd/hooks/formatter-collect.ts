import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  asRecord,
  formatErrorMessage,
  getCwd,
  getSessionId,
  readStdinJson,
} from "../shared/hook-io.ts";
import {
  collectFormatterFiles,
  type FormatterMarker,
  getFormatterMarkerDir,
  resolveWorkspaceRoot,
} from "../shared/formatter.ts";
import { pathHash } from "../shared/write-hash.ts";

async function main(): Promise<void> {
  try {
    const data = await readStdinJson();
    const toolName = getToolName(data);
    if (toolName !== "Write" && toolName !== "Edit") return;

    const inputFilePath = getInputFilePath(data);
    if (!inputFilePath) return;

    const workspaceRoot = resolveWorkspaceRoot({
      cwd: getCwd(data),
      projectDir: process.env["CLAUDE_PROJECT_DIR"],
    });

    const targetFiles = await collectFormatterFiles(workspaceRoot, [inputFilePath], {
      cwd: getCwd(data),
    });
    if (targetFiles.length === 0) return;

    const markerDir = getFormatterMarkerDir(getSessionId(data));
    await mkdir(markerDir, { recursive: true });

    for (const filePath of targetFiles) {
      const marker: FormatterMarker = {
        workspaceRoot,
        filePath,
        createdAt: Date.now(),
        toolName,
      };
      await writeFile(getFormatterMarkerPath(markerDir, filePath, data), JSON.stringify(marker), {
        encoding: "utf8",
        flag: "wx",
      });
    }
  } catch (error) {
    console.error(`plugins/sd formatter collect failed: ${formatErrorMessage(error)}`);
    process.exit(1);
  }
}

function getFormatterMarkerPath(markerDir: string, filePath: string, data: unknown): string {
  const markerId = getToolUseId(data) || "unknown";
  return join(markerDir, `${pathHash(filePath)}-${pathHash(markerId)}-${randomUUID()}.json`);
}

function getInputFilePath(data: unknown): string {
  const filePath = asRecord(asRecord(data)?.["tool_input"])?.["file_path"];
  return typeof filePath === "string" ? filePath : "";
}

function getToolName(data: unknown): string {
  const toolName = asRecord(data)?.["tool_name"];
  return typeof toolName === "string" ? toolName : "";
}

function getToolUseId(data: unknown): string {
  const toolUseId = asRecord(data)?.["tool_use_id"];
  return typeof toolUseId === "string" && toolUseId ? toolUseId : "";
}

await main();
