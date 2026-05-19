import path from "path";
import { copyFixed, renderToFile } from "../render";
import { TEMPLATES_ROOT } from "../template-paths";
import type { RenderData } from "../types";

const TPL = path.join(TEMPLATES_ROOT, "workspace-root");

const FIXED = [
  ".gitignore",
  ".npmrc",
  ".prettierignore",
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
  for (const name of FIXED) {
    await copyFixed(path.join(TPL, name), path.join(cwd, name));
  }
  for (const name of HBS) {
    await renderToFile(path.join(TPL, `${name}.hbs`), path.join(cwd, name), data);
  }
}
