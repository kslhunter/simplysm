import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function buildSimplysmReferenceContext(options: {
  projectDir: string;
  pluginRoot: string;
}): Promise<string | undefined> {
  const pluginRoot = options.pluginRoot;
  if (!pluginRoot) return undefined;

  const refRoot = join(pluginRoot, "references");
  const major = await readSimplysmMajor(options.projectDir);

  if (!major) {
    return [
      `## 활성 simplysm references (\`${toPosixPath(refRoot)}\`)`,
      "",
      "- (`@simplysm/sd-cli` 의존 미선언 — 버전별 `simplysm<major>` references 비활성)",
    ].join("\n");
  }

  const base = join(refRoot, `simplysm${major}`);
  const readmePath = join(base, "README.md");
  if (!existsSync(readmePath)) {
    return [
      `## 활성 simplysm references (\`${toPosixPath(base)}\`)`,
      "",
      `- (\`simplysm${major}\` references 디렉터리 없음)`,
    ].join("\n");
  }

  return [
    `## 활성 simplysm references (\`${toPosixPath(base)}\`)`,
    "",
    `아래는 \`${toPosixPath(readmePath)}\` 전문. 본문의 \`./\` 상대링크는 \`${toPosixPath(base)}\` 기준으로 Read.`,
    "",
    (await readFile(readmePath, "utf8")).trim(),
  ].join("\n");
}

async function readSimplysmMajor(projectDir: string): Promise<string | undefined> {
  const packagePath = join(projectDir, "package.json");
  if (!existsSync(packagePath)) return undefined;

  const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as unknown;
  const packageRecord = asRecord(packageJson);
  const dependencyRange =
    asRecord(packageRecord?.["dependencies"])?.["@simplysm/sd-cli"] ??
    asRecord(packageRecord?.["devDependencies"])?.["@simplysm/sd-cli"];

  if (dependencyRange === undefined) return undefined;

  const match = String(dependencyRange).match(/\d+/);
  return match?.[0];
}

function toPosixPath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
