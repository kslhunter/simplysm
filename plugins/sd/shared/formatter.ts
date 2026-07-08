import { execFile, type ExecFileException } from "node:child_process";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { isRegularFile, pathHash, resolveFileKey } from "./write-hash.ts";

export type FormatterName = "oxfmt" | "prettier";

export interface ResolveWorkspaceRootOptions {
  cwd: string;
  projectDir?: string | undefined;
}

export interface CollectFormatterFilesOptions {
  cwd?: string | undefined;
}

export interface RunFormatterOptions {
  signal?: AbortSignal | undefined;
}

export interface FormatterRunResult {
  formatter?: FormatterName | undefined;
  files: string[];
  success: boolean;
  code: number;
  stdout: string;
  stderr: string;
  skipped: boolean;
  skippedReason?: string | undefined;
}

export interface FormatterMarker {
  workspaceRoot: string;
  filePath: string;
  createdAt: number;
  toolName: string;
}

const PLUGINS_SD_PATH_PARTS = ["plugins", "sd"] as const;
const FORMATTER_MAX_BUFFER_BYTES = 10 * 1024 * 1024;
const FAILURE_OUTPUT_LIMIT = 4_000;

export async function resolveWorkspaceRoot(
  options: ResolveWorkspaceRootOptions,
): Promise<string | undefined> {
  if (options.projectDir) {
    const projectRoot = resolve(options.projectDir);
    return (await hasPluginsSdManifest(projectRoot)) ? projectRoot : undefined;
  }

  let currentDir = resolve(options.cwd);

  while (true) {
    if (await hasPluginsSdManifest(currentDir)) return currentDir;

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) return undefined;
    currentDir = parentDir;
  }
}

export function resolvePluginsSdRoot(workspaceRoot: string): string {
  return join(resolve(workspaceRoot), ...PLUGINS_SD_PATH_PARTS);
}

export function getFormatterMarkerDir(sessionId: string): string {
  return join(tmpdir(), "simplysm-sd-formatter", pathHash(sessionId));
}

export async function collectPluginsSdFormatterFiles(
  workspaceRoot: string,
  inputFilePaths: readonly string[],
  options: CollectFormatterFilesOptions = {},
): Promise<string[]> {
  const pluginsSdRoot = await resolveFileKey(resolvePluginsSdRoot(workspaceRoot));
  const baseDir = resolve(options.cwd ?? workspaceRoot);
  const result: string[] = [];
  const seenFileKeys = new Set<string>();

  for (const inputFilePath of inputFilePaths) {
    if (!inputFilePath) continue;

    const absolutePath = isAbsolute(inputFilePath)
      ? resolve(inputFilePath)
      : resolve(baseDir, inputFilePath);

    if (!(await isRegularFile(absolutePath))) continue;

    const fileKey = await resolveFileKey(absolutePath);
    if (!isPathUnder(pluginsSdRoot, fileKey)) continue;
    if (seenFileKeys.has(fileKey)) continue;

    seenFileKeys.add(fileKey);
    result.push(fileKey);
  }

  return result;
}

export async function runFormatter(
  workspaceRoot: string,
  files: readonly string[],
  options: RunFormatterOptions = {},
): Promise<FormatterRunResult> {
  const targetFiles = [...new Set(files)].sort();
  if (targetFiles.length === 0) {
    return {
      formatter: undefined,
      files: [],
      success: true,
      code: 0,
      stdout: "",
      stderr: "",
      skipped: true,
      skippedReason: "no-target-files",
    };
  }

  const formatter = await detectProjectFormatter(workspaceRoot);
  if (!formatter) {
    return {
      formatter: undefined,
      files: targetFiles,
      success: true,
      code: 0,
      stdout: "",
      stderr: "",
      skipped: true,
      skippedReason: "formatter-not-declared",
    };
  }

  return await new Promise<FormatterRunResult>((resolveResult) => {
    execFile(
      "bun",
      getFormatterArgs(formatter, targetFiles),
      {
        cwd: resolve(workspaceRoot),
        encoding: "utf8",
        maxBuffer: FORMATTER_MAX_BUFFER_BYTES,
        signal: options.signal,
      },
      (error, stdout, stderr) => {
        const code = getExitCode(error);
        resolveResult({
          formatter,
          files: targetFiles,
          success: code === 0,
          code,
          stdout: normalizeOutput(stdout),
          stderr: normalizeOutput(stderr),
          skipped: false,
        });
      },
    );
  });
}

export function formatFailureMessage(
  result: FormatterRunResult,
  title = "plugins/sd 자동 포맷 실패",
): string {
  const sections = [
    result.formatter ? `${title} (${result.formatter})` : title,
    `종료 코드: ${result.code}`,
    `대상 파일:\n${result.files.map((filePath) => `- ${filePath}`).join("\n") || "- 없음"}`,
  ];

  if (result.stdout.trim()) {
    sections.push(`stdout:\n${truncateText(result.stdout.trim(), FAILURE_OUTPUT_LIMIT)}`);
  }

  if (result.stderr.trim()) {
    sections.push(`stderr:\n${truncateText(result.stderr.trim(), FAILURE_OUTPUT_LIMIT)}`);
  }

  return sections.join("\n\n");
}

function getFormatterArgs(formatter: FormatterName, targetFiles: readonly string[]): string[] {
  if (formatter === "oxfmt") {
    return ["x", "oxfmt", "--no-error-on-unmatched-pattern", ...targetFiles];
  }
  return ["x", "prettier", "--write", "--ignore-unknown", ...targetFiles];
}

async function detectProjectFormatter(workspaceRoot: string): Promise<FormatterName | undefined> {
  const packageJsonPath = join(resolve(workspaceRoot), "package.json");
  if (!(await isRegularFile(packageJsonPath))) return undefined;

  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as unknown;
  const packageRecord = asRecord(packageJson);
  if (!packageRecord) return undefined;

  const dependencyFields = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ];
  const hasDependency = (packageName: string): boolean =>
    dependencyFields.some(
      (fieldName) => typeof asRecord(packageRecord[fieldName])?.[packageName] === "string",
    );

  if (hasDependency("oxfmt")) return "oxfmt";
  if (hasDependency("prettier")) return "prettier";
  return undefined;
}

async function hasPluginsSdManifest(workspaceRoot: string): Promise<boolean> {
  return await isRegularFile(join(workspaceRoot, ...PLUGINS_SD_PATH_PARTS, "package.json"));
}

function isPathUnder(parentPath: string, childPath: string): boolean {
  const relativePath = relative(parentPath, childPath);
  return relativePath !== "" && !relativePath.startsWith("..") && !isAbsolute(relativePath);
}

function getExitCode(error: ExecFileException | null): number {
  if (!error) return 0;
  if (typeof error.code === "number") return error.code;
  if (error.signal) return 130;
  return 1;
}

function normalizeOutput(output: string | Buffer): string {
  return typeof output === "string" ? output : output.toString("utf8");
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n… (${text.length - maxLength} chars truncated)`;
}
