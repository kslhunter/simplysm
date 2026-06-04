import path from "path";
import { copyFixed, renderToFile } from "../render";
import { TEMPLATES_ROOT } from "../template-paths";
import type { RenderData } from "../types";

const TPL = path.join(TEMPLATES_ROOT, "server");

export async function generateServer(cwd: string, data: RenderData): Promise<void> {
  const out = path.resolve(cwd, "packages/server");

  await copyFixed(path.join(TPL, "tsconfig.json"), path.join(out, "tsconfig.json"));

  await renderToFile(path.join(TPL, "package.json.hbs"), path.join(out, "package.json"), data);
  await renderToFile(path.join(TPL, "src/main.ts.hbs"), path.join(out, "src/main.ts"), data);

  if (data.hasDb) {
    await renderToFile(
      path.join(TPL, "src/utils/orm.utils.ts.hbs"),
      path.join(out, "src/utils/orm.utils.ts"),
      data,
    );
    await renderToFile(
      path.join(TPL, "src/services/dev.service.ts.hbs"),
      path.join(out, "src/services/dev.service.ts"),
      data,
    );
    await renderToFile(
      path.join(TPL, "src/index.ts.hbs"),
      path.join(out, "src/index.ts"),
      data,
    );
  }

  if (data.hasAuth) {
    await renderToFile(
      path.join(TPL, "src/services/auth.service.ts.hbs"),
      path.join(out, "src/services/auth.service.ts"),
      data,
    );
    await copyFixed(
      path.join(TPL, "public-dev/초기화.xlsx"),
      path.join(out, "public-dev/초기화.xlsx"),
    );
  }
}
