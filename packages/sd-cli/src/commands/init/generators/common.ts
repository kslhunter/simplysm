import path from "path";
import { copyFixed, renderToFile } from "../render";
import { TEMPLATES_ROOT } from "../template-paths";
import type { RenderData } from "../types";

const TPL = path.join(TEMPLATES_ROOT, "common");

export async function generateCommon(cwd: string, data: RenderData): Promise<void> {
  const out = path.resolve(cwd, "packages/common");

  await copyFixed(path.join(TPL, "tsconfig.json"), path.join(out, "tsconfig.json"));

  await renderToFile(path.join(TPL, "package.json.hbs"), path.join(out, "package.json"), data);
  await renderToFile(path.join(TPL, "src/index.ts.hbs"), path.join(out, "src/index.ts"), data);

  if (data.hasDb) {
    await copyFixed(
      path.join(TPL, "src/MainDbContext.ts"),
      path.join(out, "src/MainDbContext.ts"),
    );
  }
}
