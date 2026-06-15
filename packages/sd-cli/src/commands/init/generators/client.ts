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
  await copyFixed(path.join(TPL, "public/favicon.ico"), path.join(out, "public/favicon.ico"));
  await renderToFile(
    path.join(TPL, "public/robots.txt.hbs"),
    path.join(out, "public/robots.txt"),
    data,
  );
  await copyFixed(path.join(TPL, "src/polyfills.ts"), path.join(out, "src/polyfills.ts"));
  await copyFixed(path.join(TPL, "src/styles.scss"), path.join(out, "src/styles.scss"));

  if (client.isMobile) {
    await copyFixed(path.join(TPL, "res"), path.join(out, "res"));
  }

  await renderToFile(path.join(TPL, "package.json.hbs"), path.join(out, "package.json"), data);
  await renderToFile(path.join(TPL, "src/main.ts.hbs"), path.join(out, "src/main.ts"), data);
  await renderToFile(path.join(TPL, "src/app.root.ts.hbs"), path.join(out, "src/app.root.ts"), data);
  await renderToFile(path.join(TPL, "src/index.html.hbs"), path.join(out, "src/index.html"), data);

  if (data.hasDb) {
    await renderToFile(
      path.join(TPL, "src/modals/dev.modal.ts.hbs"),
      path.join(out, "src/modals/dev.modal.ts"),
      data,
    );
  }

  if (client.hasRouter) {
    await renderToFile(path.join(TPL, "src/routes.ts.hbs"), path.join(out, "src/routes.ts"), data);
  }

  if (client.useSsg) {
    await renderToFile(
      path.join(TPL, "src/main.server.ts.hbs"),
      path.join(out, "src/main.server.ts"),
      data,
    );
  }

  if (data.hasAuth && client.hasRouter) {
    await renderToFile(
      path.join(TPL, "src/app/login/login.view.ts.hbs"),
      path.join(out, "src/app/login/login.view.ts"),
      data,
    );
    await renderToFile(
      path.join(TPL, "src/app/home/home.view.ts.hbs"),
      path.join(out, "src/app/home/home.view.ts"),
      data,
    );
    await renderToFile(
      path.join(TPL, "src/app/home/main/main.view.ts.hbs"),
      path.join(out, "src/app/home/main/main.view.ts"),
      data,
    );
    await renderToFile(
      path.join(TPL, "src/app/home/my-info/my-info.detail.ts.hbs"),
      path.join(out, "src/app/home/my-info/my-info.detail.ts"),
      data,
    );
    await renderToFile(
      path.join(TPL, "src/app/home/master/user.list.ts.hbs"),
      path.join(out, `src/app/home/master/${data.userEntityKebab}/${data.userEntityKebab}.list.ts`),
      data,
    );
    await renderToFile(
      path.join(TPL, "src/app/home/master/user.detail.ts.hbs"),
      path.join(out, `src/app/home/master/${data.userEntityKebab}/${data.userEntityKebab}.detail.ts`),
      data,
    );
    await renderToFile(
      path.join(TPL, "src/app/home/master/role-permission/role.list.ts.hbs"),
      path.join(out, "src/app/home/master/role-permission/role.list.ts"),
      data,
    );
    await renderToFile(
      path.join(TPL, "src/app/home/master/role-permission/role.detail.ts.hbs"),
      path.join(out, "src/app/home/master/role-permission/role.detail.ts"),
      data,
    );
    await renderToFile(
      path.join(TPL, "src/app/home/master/role-permission/role-permission.view.ts.hbs"),
      path.join(out, "src/app/home/master/role-permission/role-permission.view.ts"),
      data,
    );
    await renderToFile(
      path.join(TPL, "src/app/home/master/role-permission/role-permission.detail.ts.hbs"),
      path.join(out, "src/app/home/master/role-permission/role-permission.detail.ts"),
      data,
    );
    await renderToFile(
      path.join(TPL, "src/app/home/system/data-log/data-log.list.ts.hbs"),
      path.join(out, "src/app/home/system/data-log/data-log.list.ts"),
      data,
    );
    await renderToFile(
      path.join(TPL, "src/app/home/system/system-log/system-log.list.ts.hbs"),
      path.join(out, "src/app/home/system/system-log/system-log.list.ts"),
      data,
    );
    await renderToFile(
      path.join(TPL, "src/modals/text-view.modal.ts.hbs"),
      path.join(out, "src/modals/text-view.modal.ts"),
      data,
    );
    await copyFixed(
      path.join(TPL, "login-public/assets/logo.png"),
      path.join(out, "public/assets/logo.png"),
    );
    await copyFixed(
      path.join(TPL, "login-public/assets/logo-landscape.png"),
      path.join(out, "public/assets/logo-landscape.png"),
    );
  }
}
