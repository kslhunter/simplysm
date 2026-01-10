import { glob } from "glob";
import { ESLint } from "eslint";
import { createJiti } from "jiti";
import path from "path";
import fs from "fs";

export interface LintOptions {
  patterns: string[];
  fix: boolean;
  timing: boolean;
}

/**
 * eslint.config.ts/js에서 globalIgnores 패턴을 추출합니다.
 * files 속성 없이 ignores만 있는 설정 객체가 globalIgnores입니다.
 */
async function loadIgnorePatterns(cwd: string): Promise<string[]> {
  const configFiles = [
    "eslint.config.ts",
    "eslint.config.mts",
    "eslint.config.js",
    "eslint.config.mjs",
  ];

  let configPath: string | undefined;
  for (const file of configFiles) {
    const fullPath = path.join(cwd, file);
    if (fs.existsSync(fullPath)) {
      configPath = fullPath;
      break;
    }
  }

  if (configPath === undefined) {
    throw new Error(
      `ESLint 설정 파일을 찾을 수 없습니다: ${configFiles.join(", ")}`
    );
  }

  const jiti = createJiti(import.meta.url);
  const configModule = (await jiti.import(configPath)) as
    | { default?: unknown[] }
    | unknown[];
  const configs = Array.isArray(configModule)
    ? configModule
    : (configModule as { default: unknown[] }).default;

  if (!Array.isArray(configs)) {
    throw new Error(`ESLint 설정이 배열이 아닙니다: ${configPath}`);
  }

  const ignores: string[] = [];
  for (const item of configs) {
    if (
      item !== null &&
      typeof item === "object" &&
      "ignores" in item &&
      Array.isArray((item as { ignores: unknown }).ignores)
    ) {
      // files가 없고 ignores만 있는 경우 = globalIgnores
      if (!("files" in item)) {
        ignores.push(...((item as { ignores: string[] }).ignores));
      }
    }
  }

  return ignores;
}

export async function runLint(options: LintOptions): Promise<void> {
  const { patterns, fix, timing } = options;
  const cwd = process.cwd();

  if (timing) {
    process.env["TIMING"] = "1";
  }

  // eslint.config.ts/js에서 ignore 패턴 로드
  const ignorePatterns = await loadIgnorePatterns(cwd);

  // glob으로 파일 목록 생성 (ignore 적용)
  const files = await glob(patterns, {
    cwd,
    ignore: ignorePatterns,
    nodir: true,
    absolute: true,
  });

  if (files.length === 0) {
    return;
  }

  // ESLint 실행
  const eslint = new ESLint({ cwd, fix });
  const results = await eslint.lintFiles(files);

  if (fix) {
    await ESLint.outputFixes(results);
  }

  // 포맷터 출력
  const formatter = await eslint.loadFormatter("stylish");
  const resultText = await formatter.format(results);
  process.stdout.write(resultText);

  // 에러 있으면 exit code 1
  const errorCount = results.reduce((sum, r) => sum + r.errorCount, 0);
  if (errorCount > 0) {
    process.exitCode = 1;
  }
}
