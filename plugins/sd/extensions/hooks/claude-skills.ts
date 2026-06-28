import { statSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export function registerClaudeSkillsHook(pi: ExtensionAPI) {
  pi.on("resources_discover", (event) => {
    const skillPaths = findClaudeSkillPaths(event.cwd);
    return skillPaths.length === 0 ? undefined : { skillPaths };
  });
}

function findClaudeSkillPaths(startDir: string): string[] {
  const skillPaths: string[] = [];

  for (const currentDir of getAncestorDirs(startDir)) {
    const skillDir = join(currentDir, ".claude", "skills");
    if (isDirectory(skillDir)) skillPaths.push(skillDir);

    if (pathExists(join(currentDir, ".git"))) break;
  }

  return skillPaths;
}

function getAncestorDirs(startDir: string): string[] {
  const dirs: string[] = [];
  let currentDir = startDir;

  while (true) {
    dirs.push(currentDir);

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) return dirs;

    currentDir = parentDir;
  }
}

function isDirectory(filePath: string): boolean {
  try {
    return statSync(filePath).isDirectory();
  } catch (error) {
    if (isMissingPathError(error)) return false;
    throw error;
  }
}

function pathExists(filePath: string): boolean {
  try {
    statSync(filePath);
    return true;
  } catch (error) {
    if (isMissingPathError(error)) return false;
    throw error;
  }
}

function isMissingPathError(error: unknown): boolean {
  return error instanceof Error && "code" in error && ["ENOENT", "ENOTDIR"].includes(String(error.code));
}
