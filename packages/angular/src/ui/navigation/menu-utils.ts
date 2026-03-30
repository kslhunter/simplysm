export interface ISdMenu {
  title: string;
  codeChain: string[];
  url?: string;
  icon?: string;
  children?: ISdMenu[];
}

export function getMenuRouterLinkOption(
  menu: ISdMenu,
): { link: string; queryParams: Record<string, string> | undefined } | undefined {
  if (menu.children !== undefined || menu.url != null) {
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
  menu: ISdMenu,
  fullPageCode: string | undefined,
  customFn?: (menu: ISdMenu) => boolean,
): boolean {
  return customFn ? customFn(menu) : fullPageCode === menu.codeChain.join(".");
}
