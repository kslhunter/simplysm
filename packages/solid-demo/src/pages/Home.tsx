import { Show, Suspense } from "solid-js";
import { useNavigate, type RouteSectionProps } from "@solidjs/router";
import { Sidebar, ThemeToggle } from "@simplysm/solid";
import { env } from "@simplysm/core-common";
import { appStructure } from "../appStructure";

export function Home(props: RouteSectionProps) {
  const navigate = useNavigate();
  return (
    <Sidebar.Container>
      <Sidebar>
        <div class="flex items-center justify-between p-2 px-4">
          <img src="logo-landscape.png" alt="SIMPLYSM" class="h-9 w-auto" />
          <ThemeToggle size="sm" />
        </div>
        <Sidebar.User
          name="홍길동"
          description="hong@example.com"
          menus={[
            { title: "설정", onClick: () => alert("설정") },
            { title: "로그아웃", onClick: () => navigate("/login") },
          ]}
        />
        <Sidebar.Menu menus={appStructure.usableMenus()} />
        <Show when={env.VER}>
          <div class="pointer-events-none absolute bottom-0 left-0 px-2 py-1 text-sm text-black/30 dark:text-white/30">
            v{env.VER}
            <Show when={env.DEV}>_dev</Show>
          </div>
        </Show>
      </Sidebar>
      <main class="h-full overflow-auto">
        <Suspense fallback={<div>로딩 중...</div>}>{props.children}</Suspense>
      </main>
    </Sidebar.Container>
  );
}
