import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const PACKAGE_NAME = "@simplysm/sd";
const UPDATE_TIMEOUT_MS = 5 * 60 * 1000;
const LIST_TIMEOUT_MS = 30 * 1000;
const GIT_TIMEOUT_MS = 10 * 1000;

interface ListedPackage {
  source: string;
  installedPath?: string;
}

interface PackageSnapshot {
  pkg: ListedPackage;
  fingerprint?: string;
}

let autoUpdateStarted = false;

export function registerAutoUpdate(pi: ExtensionAPI) {
  pi.on("session_start", (event, ctx) => {
    if (event.reason !== "startup") return;
    if (ctx.mode !== "tui") return;
    if (autoUpdateStarted) return;

    autoUpdateStarted = true;
    void runAutoUpdate(pi, ctx);
  });
}

async function runAutoUpdate(pi: ExtensionAPI, ctx: ExtensionContext) {
  try {
    const before = await collectSnapshots(pi, ctx);
    if (before.length === 0) return;

    for (const snapshot of before) {
      await pi.exec("pi", ["update", snapshot.pkg.source], {
        cwd: ctx.cwd,
        timeout: UPDATE_TIMEOUT_MS,
      });
    }

    const after = await collectSnapshots(pi, ctx);
    if (!hasChanged(before, after)) return;

    ctx.ui.notify(
      "심플리즘 Pi 패키지가 업데이트되었습니다. 적용하려면 /reload를 실행하세요.",
      "info",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    ctx.ui.notify(`심플리즘 Pi 패키지 자동 업데이트에 실패했습니다: ${message}`, "warning");
  }
}

async function collectSnapshots(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
): Promise<PackageSnapshot[]> {
  const packages = await listInstalledPackages(pi, ctx);
  const targets = packages.filter(isSimplysmPackage);
  const snapshots: PackageSnapshot[] = [];

  for (const pkg of targets) {
    snapshots.push({
      pkg,
      fingerprint: await readPackageFingerprint(pi, pkg.installedPath),
    });
  }

  return snapshots;
}

async function listInstalledPackages(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
): Promise<ListedPackage[]> {
  const result = await pi.exec("pi", ["list"], {
    cwd: ctx.cwd,
    timeout: LIST_TIMEOUT_MS,
  });
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || "pi list 실행에 실패했습니다.");
  }

  return parsePackageList(result.stdout);
}

function parsePackageList(output: string): ListedPackage[] {
  const packages: ListedPackage[] = [];
  let current: ListedPackage | undefined;

  for (const rawLine of output.split(/\r?\n/)) {
    const line = stripAnsi(rawLine);
    if (!line.trim()) continue;
    if (!line.startsWith("  ")) continue;

    const trimmed = line.trim();
    if (!line.startsWith("    ")) {
      current = { source: normalizeListedSource(trimmed) };
      packages.push(current);
      continue;
    }

    if (current && !current.installedPath) {
      current.installedPath = trimmed;
    }
  }

  return packages;
}

function normalizeListedSource(source: string): string {
  return source.endsWith(" (filtered)") ? source.slice(0, -" (filtered)".length) : source;
}

function isSimplysmPackage(pkg: ListedPackage): boolean {
  if (isLocalSource(pkg.source)) return false;

  const source = pkg.source.toLowerCase();
  const installedPath = pkg.installedPath?.toLowerCase() ?? "";
  return source.includes(PACKAGE_NAME) || installedPath.includes(PACKAGE_NAME);
}

function isLocalSource(source: string): boolean {
  return (
    source.startsWith(".") ||
    source.startsWith("/") ||
    source.startsWith("~") ||
    /^[a-z]:[\\/]/i.test(source)
  );
}

async function readPackageFingerprint(
  pi: ExtensionAPI,
  installedPath: string | undefined,
): Promise<string | undefined> {
  if (!installedPath || !existsSync(installedPath)) return undefined;

  const gitHead = await readGitHead(pi, installedPath);
  if (gitHead) return `git:${gitHead}`;

  const packageVersion = readPackageVersion(installedPath);
  if (packageVersion) return `package:${packageVersion}`;

  return undefined;
}

async function readGitHead(pi: ExtensionAPI, installedPath: string): Promise<string | undefined> {
  try {
    const result = await pi.exec("git", ["rev-parse", "HEAD"], {
      cwd: installedPath,
      timeout: GIT_TIMEOUT_MS,
    });
    if (result.code !== 0) return undefined;
    const head = result.stdout.trim();
    return head || undefined;
  } catch {
    return undefined;
  }
}

function readPackageVersion(installedPath: string): string | undefined {
  const packageJsonPath = join(installedPath, "package.json");
  if (!existsSync(packageJsonPath)) return undefined;

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version?: unknown };
    return typeof packageJson.version === "string" ? packageJson.version : undefined;
  } catch {
    return undefined;
  }
}

function hasChanged(before: PackageSnapshot[], after: PackageSnapshot[]): boolean {
  const afterBySource = new Map(
    after.map((snapshot) => [snapshot.pkg.source, snapshot.fingerprint]),
  );
  return before.some((snapshot) => snapshot.fingerprint !== afterBySource.get(snapshot.pkg.source));
}

function stripAnsi(value: string): string {
  return value.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "");
}
