import path from "path";
import { copyFixed, renderToFile } from "../render";
import { TEMPLATES_ROOT } from "../template-paths";
import type { RenderData } from "../types";

const TPL = path.join(TEMPLATES_ROOT, "client-common");

export async function generateClientCommon(cwd: string, data: RenderData): Promise<void> {
  const out = path.resolve(cwd, "packages/client-common");

  await copyFixed(path.join(TPL, "tsconfig.json"), path.join(out, "tsconfig.json"));

  await renderToFile(path.join(TPL, "package.json.hbs"), path.join(out, "package.json"), data);
  await renderToFile(path.join(TPL, "src/index.ts.hbs"), path.join(out, "src/index.ts"), data);

  if (data.hasServer) {
    await copyFixed(
      path.join(TPL, "src/providers/AppServiceProvider.ts"),
      path.join(out, "src/providers/AppServiceProvider.ts"),
    );
  }
  if (data.hasDb) {
    await renderToFile(
      path.join(TPL, "src/providers/AppOrmProvider.ts.hbs"),
      path.join(out, "src/providers/AppOrmProvider.ts"),
      data,
    );
  }
}
