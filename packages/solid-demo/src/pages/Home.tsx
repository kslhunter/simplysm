import { Show, Suspense } from "solid-js";
import { useNavigate, useLocation, type RouteSectionProps } from "@solidjs/router";
import { NotificationBell, Sidebar, ThemeToggle, Topbar } from "@simplysm/solid";
import { env } from "@simplysm/core-common";
import { useAppStructure } from "../appStructure";

export function Home(props: RouteSectionProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const appStructure = useAppStructure();

  const titleChain = () => {
    const chain = appStructure.getTitleChainByHref(location.pathname);
    return chain.length > 1 ? chain.slice(1) : chain;
  };

  return (
    <Sidebar.Container>
      <Sidebar>
        <div class="p-2 px-4">
          <img src="logo-landscape.png" alt="SIMPLYSM" class="h-9 w-auto" />
        </div>
        <Sidebar.User
          name="홍길동"
          description="hong@example.com"
          menus={[
            { title: "설정", onClick: () => alert("설정") },
            { title: "로그아웃", onClick: () => navigate("/login") },
          ]}
        />
        <Sidebar.Menu menus={appStructure.usableMenus()} class="flex-1" />
        <Show when={env.VER}>
          <div class="pointer-events-none px-2 py-1 text-sm text-black/30 dark:text-white/30">
            v{env.VER}
            <Show when={env.DEV}>(dev)</Show>
          </div>
        </Show>
      </Sidebar>

      <Topbar.Container>
        <Topbar>
          <span class="ml-2 mr-6 text-lg font-bold">{titleChain().join(" > ")}</span>
          <div class="flex-1" />
          <NotificationBell />
          <ThemeToggle size="sm" />
        </Topbar>

        <main class="flex-1 overflow-auto">
          <Suspense fallback={<div>로딩 중...</div>}>{props.children}</Suspense>
        </main>
      </Topbar.Container>
    </Sidebar.Container>
  );
}
