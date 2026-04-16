import type { SdMenu } from "../app-structure/sd-app-structure.types";

export type { SdMenu } from "../app-structure/sd-app-structure.types";

export function getMenuRouterLinkOption(
  menu: SdMenu,
): { link: string; queryParams: Record<string, string> | undefined } | undefined {
  if (menu.children != null || menu.url != null) {
    return undefined;
  }

  const relNav = menu.codeChain.join("/");
  const n = relNav.split("?")[0];
  const q = relNav.split("?")[1] as string | undefined;
  const qp =
    q == null
      ? undefined
      : (Object.fromEntries(new URLSearchParams(q)) as Record<string, string>);

  return {
    link: "/home/" + n,
    queryParams: qp,
  };
}

export function getIsMenuSelected(
  menu: SdMenu,
  fullPageCode: string | undefined,
  customFn?: (menu: SdMenu) => boolean,
): boolean {
  return customFn ? customFn(menu) : fullPageCode === menu.codeChain.join(".");
}
