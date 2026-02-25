import fs from "fs";
import path from "path";
import { glob } from "glob";
import { consola } from "consola";
import { fsCopy, fsMkdir, fsRm, FsWatcher, pathIsChildPath } from "@simplysm/core-node";

/**
 * Match glob patterns from replaceDeps config with target package list
 * and return { targetName, sourcePath } pairs
 *
 * @param replaceDeps - replaceDeps config from sd.config.ts (key: glob pattern, value: source path)
 * @param targetNames - List of package names found in node_modules (e.g., ["@simplysm/solid", ...])
 * @returns Array of matched { targetName, sourcePath }
 */
export function resolveReplaceDepEntries(
  replaceDeps: Record<string, string>,
  targetNames: string[],
): Array<{ targetName: string; sourcePath: string }> {
  const results: Array<{ targetName: string; sourcePath: string }> = [];

  for (const [pattern, sourceTemplate] of Object.entries(replaceDeps)) {
    // Convert glob pattern to regex: * → (.*), . → \., / → [\\/]
    const regexpText = pattern.replace(/[\\/.+*]/g, (ch) => {
      if (ch === "*") return "(.*)";
      if (ch === ".") return "\\.";
      if (ch === "/" || ch === "\\") return "[\\\\/]";
      if (ch === "+") return "\\+";
      return ch;
    });
    const regex = new RegExp(`^${regexpText}$`);
    const hasWildcard = pattern.includes("*");

    for (const targetName of targetNames) {
      const match = regex.exec(targetName);
      if (match == null) continue;

      // If capture group exists, substitute * in source path with captured value
      const sourcePath = hasWildcard ? sourceTemplate.replace(/\*/g, match[1]) : sourceTemplate;

      results.push({ targetName, sourcePath });
    }
  }

  return results;
}

/**
 * Parse pnpm-workspace.yaml content and return array of workspace packages globs
 * Simple line parsing without separate YAML library
 *
 * @param content - Content of pnpm-workspace.yaml file
 * @returns Array of glob patterns (e.g., ["packages/*", "tools/*"])
 */
export function parseWorkspaceGlobs(content: string): string[] {
  const lines = content.split("\n");
  const globs: string[] = [];
  let inPackages = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "packages:") {
      inPackages = true;
      continue;
    }

    // List items in packages section
    if (inPackages && trimmed.startsWith("- ")) {
      const value = trimmed
        .slice(2)
        .trim()
        .replace(/^["']|["']$/g, "");
      globs.push(value);
      continue;
    }

    // End when other section starts
    if (inPackages && trimmed !== "" && !trimmed.startsWith("#")) {
      break;
    }
  }

  return globs;
}

/**
 * Names to exclude during copy
 */
const EXCLUDED_NAMES = new Set(["node_modules", "package.json", ".cache", "tests"]);

/**
 * Filter function for replaceDeps copy
 * Excludes node_modules, package.json, .cache, tests
 *
 * @param itemPath - Absolute path of item to copy
 * @returns true if copy target, false if excluded
 */
function replaceDepsCopyFilter(itemPath: string): boolean {
  const basename = path.basename(itemPath);
  return !EXCLUDED_NAMES.has(basename);
}

/**
 * replaceDeps copy/replace item
 */
export interface ReplaceDepEntry {
  targetName: string;
  sourcePath: string;
  targetPath: string;
  resolvedSourcePath: string;
  actualTargetPath: string;
}

/**
 * Return type of watchReplaceDeps
 */
export interface WatchReplaceDepResult {
  entries: ReplaceDepEntry[];
  dispose: () => void;
}

/**
 * Collect project root and workspace package paths.
 *
 * Parse pnpm-workspace.yaml to collect absolute paths of workspace packages.
 * If file is missing or parsing fails, return only root path.
 *
 * @param projectRoot - Project root path
 * @returns [root, ...workspace package paths] array
 */
async function collectSearchRoots(projectRoot: string): Promise<string[]> {
  const searchRoots = [projectRoot];

  const workspaceYamlPath = path.join(projectRoot, "pnpm-workspace.yaml");
  try {
    const yamlContent = await fs.promises.readFile(workspaceYamlPath, "utf-8");
    const workspaceGlobs = parseWorkspaceGlobs(yamlContent);

    for (const pattern of workspaceGlobs) {
      const dirs = await glob(pattern, { cwd: projectRoot, absolute: true });
      searchRoots.push(...dirs);
    }
  } catch {
    // If pnpm-workspace.yaml doesn't exist, only process root
  }

  return searchRoots;
}

/**
 * Resolve all replacement target items from replaceDeps config.
 *
 * 1. Parse pnpm-workspace.yaml → workspace package paths
 * 2. Find matching packages in [root, ...workspace packages] node_modules
 * 3. Pattern matching + verify source path exists + resolve symlinks
 *
 * @param projectRoot - Project root path
 * @param replaceDeps - replaceDeps config from sd.config.ts
 * @param logger - consola logger
 * @returns Array of resolved replacement target items
 */
async function resolveAllReplaceDepEntries(
  projectRoot: string,
  replaceDeps: Record<string, string>,
  logger: ReturnType<typeof consola.withTag>,
): Promise<ReplaceDepEntry[]> {
  const entries: ReplaceDepEntry[] = [];

  const searchRoots = await collectSearchRoots(projectRoot);

  for (const searchRoot of searchRoots) {
    const nodeModulesDir = path.join(searchRoot, "node_modules");

    try {
      await fs.promises.access(nodeModulesDir);
    } catch {
      continue; // Skip if node_modules doesn't exist
    }

    // Search node_modules directories using each glob pattern from replaceDeps
    const targetNames: string[] = [];
    for (const pattern of Object.keys(replaceDeps)) {
      const matches = await glob(pattern, { cwd: nodeModulesDir });
      targetNames.push(...matches);
    }

    if (targetNames.length === 0) continue;

    // Pattern matching and path resolution
    const matchedEntries = resolveReplaceDepEntries(replaceDeps, targetNames);

    for (const { targetName, sourcePath } of matchedEntries) {
      const targetPath = path.join(nodeModulesDir, targetName);
      const resolvedSourcePath = path.resolve(projectRoot, sourcePath);

      // Verify source path exists
      try {
        await fs.promises.access(resolvedSourcePath);
      } catch {
        logger.warn(`Source path does not exist, skipping: ${resolvedSourcePath}`);
        continue;
      }

      // If targetPath is symlink, resolve to get actual .pnpm store path
      let actualTargetPath = targetPath;
      try {
        const stat = await fs.promises.lstat(targetPath);
        if (stat.isSymbolicLink()) {
          actualTargetPath = await fs.promises.realpath(targetPath);
        }
      } catch {
        // If targetPath doesn't exist, use as-is
      }

      entries.push({
        targetName,
        sourcePath,
        targetPath,
        resolvedSourcePath,
        actualTargetPath,
      });
    }
  }

  return entries;
}

/**
 * Replace packages in node_modules with source directories according to replaceDeps config.
 *
 * 1. Parse pnpm-workspace.yaml → workspace package paths
 * 2. Find matching packages in [root, ...workspace packages] node_modules
 * 3. Remove existing symlinks/directories → copy source path (excluding node_modules, package.json, .cache, tests)
 *
 * @param projectRoot - Project root path
 * @param replaceDeps - replaceDeps config from sd.config.ts
 */
export async function setupReplaceDeps(
  projectRoot: string,
  replaceDeps: Record<string, string>,
): Promise<void> {
  const logger = consola.withTag("sd:cli:replace-deps");
  let setupCount = 0;

  logger.start("Setting up replace-deps");

  const entries = await resolveAllReplaceDepEntries(projectRoot, replaceDeps, logger);

  for (const { targetName, resolvedSourcePath, actualTargetPath } of entries) {
    try {
      // Overwrite-copy source files to actualTargetPath (maintain existing directory, preserve symlinks)
      await fsCopy(resolvedSourcePath, actualTargetPath, replaceDepsCopyFilter);

      setupCount += 1;
    } catch (err) {
      logger.error(`Copy replace failed (${targetName}): ${err instanceof Error ? err.message : err}`);
    }
  }

  logger.success(`Replaced ${setupCount} dependencies`);
}

/**
 * Watch source directories according to replaceDeps config and copy changes to target paths.
 *
 * 1. Parse pnpm-workspace.yaml → workspace package paths
 * 2. Find matching packages in [root, ...workspace packages] node_modules
 * 3. Watch source directories with FsWatcher (300ms delay)
 * 4. Copy changes to target paths (excluding node_modules, package.json, .cache, tests)
 *
 * @param projectRoot - Project root path
 * @param replaceDeps - replaceDeps config from sd.config.ts
 * @returns entries and dispose function
 */
export async function watchReplaceDeps(
  projectRoot: string,
  replaceDeps: Record<string, string>,
): Promise<WatchReplaceDepResult> {
  const logger = consola.withTag("sd:cli:replace-deps:watch");

  const entries = await resolveAllReplaceDepEntries(projectRoot, replaceDeps, logger);

  // Setup source directory watchers
  const watchers: FsWatcher[] = [];
  const watchedSources = new Set<string>();

  logger.start(`Watching ${entries.length} replace-deps target(s)`);

  for (const entry of entries) {
    if (watchedSources.has(entry.resolvedSourcePath)) continue;
    watchedSources.add(entry.resolvedSourcePath);

    const excludedPaths = [...EXCLUDED_NAMES].map((name) =>
      path.join(entry.resolvedSourcePath, name),
    );

    const watcher = await FsWatcher.watch([entry.resolvedSourcePath], { followSymlinks: false });
    watcher.onChange({ delay: 300 }, async (changeInfos) => {
      for (const { path: changedPath } of changeInfos) {
        // Filter excluded items: basename match or path within excluded directory
        if (
          EXCLUDED_NAMES.has(path.basename(changedPath)) ||
          excludedPaths.some((ep) => pathIsChildPath(changedPath, ep))
        ) {
          continue;
        }

        // Copy for all entries using this source path
        for (const e of entries) {
          if (e.resolvedSourcePath !== entry.resolvedSourcePath) continue;

          // Calculate relative path from source
          const relativePath = path.relative(e.resolvedSourcePath, changedPath);
          const destPath = path.join(e.actualTargetPath, relativePath);

          try {
            // Check if source exists
            let sourceExists = false;
            try {
              await fs.promises.access(changedPath);
              sourceExists = true;
            } catch {
              // Source was deleted
            }

            if (sourceExists) {
              // Check if source is directory or file
              const stat = await fs.promises.stat(changedPath);
              if (stat.isDirectory()) {
                await fsMkdir(destPath);
              } else {
                await fsMkdir(path.dirname(destPath));
                await fsCopy(changedPath, destPath, replaceDepsCopyFilter);
              }
            } else {
              // Source was deleted → delete target
              await fsRm(destPath);
            }
          } catch (err) {
            logger.error(
              `Copy failed (${e.targetName}/${relativePath}): ${err instanceof Error ? err.message : err}`,
            );
          }
        }
      }
    });

    watchers.push(watcher);
  }

  logger.success(`Replace-deps watch ready`);

  return {
    entries,
    dispose: () => {
      for (const watcher of watchers) {
        void watcher.close();
      }
    },
  };
}
