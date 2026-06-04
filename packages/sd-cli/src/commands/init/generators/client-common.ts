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
    await renderToFile(
      path.join(TPL, "src/providers/app-service.provider.ts.hbs"),
      path.join(out, "src/providers/app-service.provider.ts"),
      data,
    );
  }
  if (data.hasAuth) {
    await renderToFile(
      path.join(TPL, "src/providers/app-auth.provider.ts.hbs"),
      path.join(out, "src/providers/app-auth.provider.ts"),
      data,
    );
  }
  if (data.hasDb) {
    await renderToFile(
      path.join(TPL, "src/providers/app-orm.provider.ts.hbs"),
      path.join(out, "src/providers/app-orm.provider.ts"),
      data,
    );
    await renderToFile(
      path.join(TPL, "src/providers/app-shared-data.provider.ts.hbs"),
      path.join(out, "src/providers/app-shared-data.provider.ts"),
      data,
    );
  }
}
