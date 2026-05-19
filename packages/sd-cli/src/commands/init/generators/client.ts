import path from "path";
import { copyFixed, renderToFile } from "../render";
import { TEMPLATES_ROOT } from "../template-paths";
import type { ClientSpec, RenderData } from "../types";

const TPL = path.join(TEMPLATES_ROOT, "client");

export async function generateClient(
  cwd: string,
  base: RenderData,
  client: ClientSpec,
): Promise<void> {
  const out = path.resolve(cwd, "packages", client.name);
  const data = { ...base, client };

  await copyFixed(path.join(TPL, "tsconfig.json"), path.join(out, "tsconfig.json"));
  await copyFixed(path.join(TPL, "ngsw-config.json"), path.join(out, "ngsw-config.json"));
  await copyFixed(path.join(TPL, "src/polyfills.ts"), path.join(out, "src/polyfills.ts"));
  await copyFixed(path.join(TPL, "src/styles.scss"), path.join(out, "src/styles.scss"));

  await renderToFile(path.join(TPL, "package.json.hbs"), path.join(out, "package.json"), data);
  await renderToFile(path.join(TPL, "src/main.ts.hbs"), path.join(out, "src/main.ts"), data);
  await renderToFile(path.join(TPL, "src/AppPage.ts.hbs"), path.join(out, "src/AppPage.ts"), data);
  await renderToFile(path.join(TPL, "src/index.html.hbs"), path.join(out, "src/index.html"), data);

  if (client.hasRouter) {
    await copyFixed(path.join(TPL, "src/routes.ts"), path.join(out, "src/routes.ts"));
  }
}
