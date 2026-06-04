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

  if (data.hasAuth) {
    await renderToFile(
      path.join(TPL, "src/app-structure.ts.hbs"),
      path.join(out, "src/app-structure.ts"),
      data,
    );
    await renderToFile(
      path.join(TPL, "src/auth-info-changed.event.ts.hbs"),
      path.join(out, "src/auth-info-changed.event.ts"),
      data,
    );
  }

  if (data.hasDb) {
    const dbTpl = path.join(TPL, "src/db");
    const dbOut = path.join(out, "src", data.dbFolderName);

    await renderToFile(
      path.join(dbTpl, "db-context.ts.hbs"),
      path.join(dbOut, `${data.dbContextFileName}.ts`),
      data,
    );
    await renderToFile(
      path.join(dbTpl, "system-data-log.ext.ts.hbs"),
      path.join(dbOut, "system-data-log.ext.ts"),
      data,
    );
    await renderToFile(
      path.join(dbTpl, "tables/system/system-data-log.ts.hbs"),
      path.join(dbOut, "tables/system/system-data-log.ts"),
      data,
    );
    await renderToFile(
      path.join(dbTpl, "tables/system/system-log.ts.hbs"),
      path.join(dbOut, "tables/system/system-log.ts"),
      data,
    );

    if (data.hasAuth) {
      await renderToFile(
        path.join(dbTpl, "tables/system/role.ts.hbs"),
        path.join(dbOut, "tables/system/role.ts"),
        data,
      );
      await renderToFile(
        path.join(dbTpl, "tables/system/role-permission.ts.hbs"),
        path.join(dbOut, "tables/system/role-permission.ts"),
        data,
      );
      await renderToFile(
        path.join(dbTpl, "tables/master/user.ts.hbs"),
        path.join(dbOut, "tables/master", `${data.userEntityKebab}.ts`),
        data,
      );
      await renderToFile(
        path.join(dbTpl, "tables/master/user-config.ts.hbs"),
        path.join(dbOut, "tables/master", `${data.userEntityKebab}-config.ts`),
        data,
      );
    }
  }
}
