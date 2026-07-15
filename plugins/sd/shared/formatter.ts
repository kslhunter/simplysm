import { execFile, type ExecFileException } from "node:child_process";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
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

const FORMATTER_MAX_BUFFER_BYTES = 10 * 1024 * 1024;
const FAILURE_OUTPUT_LIMIT = 4_000;
// Windows cmd.exe 커맨드라인 한도(~8191자)보다 보수적으로 잡아 배치 분할 기준으로 사용.
const FORMATTER_MAX_COMMAND_LINE_LENGTH = 7_000;
// 실행파일명("bun") + 인자별 공백 구분·인용부호 여유분.
const FORMATTER_ARG_LENGTH_OVERHEAD = 3;

export function resolveWorkspaceRoot(options: ResolveWorkspaceRootOptions): string {
  return resolve(options.projectDir || options.cwd);
}

export function getFormatterMarkerDir(sessionId: string): string {
  return join(tmpdir(), "simplysm-sd-formatter", pathHash(sessionId));
}

export async function collectFormatterFiles(
  workspaceRoot: string,
  inputFilePaths: readonly string[],
  options: CollectFormatterFilesOptions = {},
): Promise<string[]> {
  const workspaceRootKey = await resolveFileKey(resolve(workspaceRoot));
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
    if (!isPathUnder(workspaceRootKey, fileKey)) continue;
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

  const cwd = resolve(workspaceRoot);
  for (const batchFiles of buildFormatterBatches(formatter, targetFiles)) {
    const batchResult = await execFormatterBatch(
      cwd,
      getFormatterArgs(formatter, batchFiles),
      options.signal,
    );
    if (batchResult.code !== 0) {
      return {
        formatter,
        files: targetFiles,
        success: false,
        code: batchResult.code,
        stdout: batchResult.stdout,
        stderr: batchResult.stderr,
        skipped: false,
      };
    }
  }

  return {
    formatter,
    files: targetFiles,
    success: true,
    code: 0,
    stdout: "",
    stderr: "",
    skipped: false,
  };
}

interface FormatterBatchResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function execFormatterBatch(
  cwd: string,
  args: readonly string[],
  signal: AbortSignal | undefined,
): Promise<FormatterBatchResult> {
  return await new Promise<FormatterBatchResult>((resolveResult) => {
    execFile(
      "bun",
      [...args],
      {
        cwd,
        encoding: "utf8",
        maxBuffer: FORMATTER_MAX_BUFFER_BYTES,
        signal,
      },
      (error, stdout, stderr) => {
        resolveResult({
          code: getExitCode(error),
          stdout: normalizeOutput(stdout),
          stderr: normalizeOutput(stderr),
        });
      },
    );
  });
}

// 커맨드라인 총 길이가 한도를 넘지 않도록 파일 목록을 여러 배치로 분할.
// 단일 파일 경로가 이미 한도를 넘어도 최소 1개는 배치에 넣어 실행을 보장.
function buildFormatterBatches(
  formatter: FormatterName,
  targetFiles: readonly string[],
): string[][] {
  const baseLength = "bun".length + estimateArgsLength(getFormatterArgs(formatter, []));

  const batches: string[][] = [];
  let currentBatch: string[] = [];
  let currentLength = baseLength;

  for (const filePath of targetFiles) {
    const fileLength = filePath.length + FORMATTER_ARG_LENGTH_OVERHEAD;
    if (currentBatch.length > 0 && currentLength + fileLength > FORMATTER_MAX_COMMAND_LINE_LENGTH) {
      batches.push(currentBatch);
      currentBatch = [];
      currentLength = baseLength;
    }
    currentBatch.push(filePath);
    currentLength += fileLength;
  }

  if (currentBatch.length > 0) batches.push(currentBatch);
  return batches;
}

function estimateArgsLength(args: readonly string[]): number {
  return args.reduce((sum, arg) => sum + arg.length + FORMATTER_ARG_LENGTH_OVERHEAD, 0);
}

export function formatFailureMessage(result: FormatterRunResult, title = "자동 포맷 실패"): string {
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
