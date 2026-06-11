import path from "path";
import { copyFixed, renderToFile } from "../render";
import { TEMPLATES_ROOT } from "../template-paths";
import type { RenderData } from "../types";

const TPL = path.join(TEMPLATES_ROOT, "workspace-root");

// npm 은 패킹 시 `.gitignore`·`.npmrc` 를 특수 처리해 배포 tarball 에서 제외함.
// 이를 회피하려고 점 없는 이름으로 저장한 뒤, 생성 시 실제 이름으로 복사함.
// [저장명, 출력명] 형태면 rename, 단일 문자열이면 동일명 복사.
const FIXED: (string | [string, string])[] = [
  ".editorconfig",
  ["gitignore", ".gitignore"],
  ["npmrc", ".npmrc"],
  ".prettierrc.yaml",
  "eslint.config.ts",
  "pnpm-workspace.yaml",
];

const HBS = [
  "mise.toml",
  "package.json",
  "tsconfig.json",
  "sd.config.ts",
  "vitest.config.ts",
];

export async function generateRoot(cwd: string, data: RenderData): Promise<void> {
  for (const entry of FIXED) {
    const [src, out] = Array.isArray(entry) ? entry : [entry, entry];
    await copyFixed(path.join(TPL, src), path.join(cwd, out));
  }
  for (const name of HBS) {
    await renderToFile(path.join(TPL, `${name}.hbs`), path.join(cwd, name), data);
  }
}
