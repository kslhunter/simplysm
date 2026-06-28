import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, rename, stat, unlink, utimes, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

async function main(): Promise<void> {
  try {
    const pluginRoot = process.env["CLAUDE_PLUGIN_ROOT"];
    if (!pluginRoot) return;

    const dataDir = join(getHomeDir(), ".claude", "sd");
    await mkdir(dataDir, { recursive: true });

    const sourcePath = join(pluginRoot, "hooks", "assets", "statusline.ts");
    const targetPath = join(dataDir, "statusline.ts");
    const previousTargetPath = join(dataDir, "statusline.py");
    await copyStatuslineIfNeeded(sourcePath, targetPath);
    await injectStatuslineSetting(targetPath, previousTargetPath);
  } catch {
    // statusline 설정 실패는 세션 시작을 막지 않습니다.
  }
}

async function copyStatuslineIfNeeded(sourcePath: string, targetPath: string): Promise<void> {
  if (!existsSync(sourcePath)) return;

  const sourceStat = await stat(sourcePath);
  const targetStat = await stat(targetPath).catch(() => undefined);
  const alreadyCopied =
    targetStat !== undefined &&
    sourceStat.size === targetStat.size &&
    Math.trunc(sourceStat.mtimeMs) === Math.trunc(targetStat.mtimeMs);

  if (alreadyCopied) return;

  await copyFile(sourcePath, targetPath);
  await utimes(targetPath, sourceStat.atime, sourceStat.mtime);
}

async function injectStatuslineSetting(statuslinePath: string, previousStatuslinePath: string): Promise<void> {
  const settingsPath = join(getHomeDir(), ".claude", "settings.json");
  let settings: Record<string, unknown> = {};

  if (existsSync(settingsPath)) {
    try {
      const parsed = JSON.parse(await readFile(settingsPath, "utf8")) as unknown;
      if (isRecord(parsed)) settings = parsed;
    } catch {
      settings = {};
    }
  }

  const statuslineCommand = `bun "${toPosixPath(statuslinePath)}"`;
  const previousStatuslineCommand = `python "${toPosixPath(previousStatuslinePath)}"`;
  const currentStatusline = settings["statusLine"];

  if (isRecord(currentStatusline)) {
    const currentCommand = currentStatusline["command"];
    if (currentCommand === statuslineCommand) return;
    if (currentCommand !== previousStatuslineCommand) return;
  } else if ("statusLine" in settings) {
    return;
  }

  settings["statusLine"] = {
    type: "command",
    command: statuslineCommand,
  };

  await mkdir(dirname(settingsPath), { recursive: true });
  const tempPath = `${settingsPath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(tempPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
    await rename(tempPath, settingsPath);
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }
}

function getHomeDir(): string {
  const homeDir = process.env["HOME"] ?? process.env["USERPROFILE"];
  if (homeDir) return homeDir;
  return dirname(fileURLToPath(import.meta.url));
}

function toPosixPath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

if ((import.meta as { main?: boolean }).main) {
  await main();
}
