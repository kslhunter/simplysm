import type { ConsolaInstance } from "consola";

export interface FsChange {
  event: string;
  path: string;
}

export function hasFileAddOrRemove(changes: FsChange[]): boolean {
  return changes.some((c) => c.event === "add" || c.event === "unlink");
}

export function shouldSkipRebuild(
  filePaths: Iterable<string>,
  hasAddOrRemove: boolean,
  lastSourceFilePaths: Set<string> | undefined,
  logger: ConsolaInstance,
): boolean {
  if (hasAddOrRemove) return false;
  if (lastSourceFilePaths == null) return false;

  for (const p of filePaths) {
    if (lastSourceFilePaths.has(p)) return false;
  }

  logger.debug("변경된 파일이 빌드에 포함되지 않아 리빌드 건너뜀");
  return true;
}
