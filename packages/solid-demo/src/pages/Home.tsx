import { Show, Suspense } from "solid-js";
import { useNavigate, type RouteSectionProps } from "@solidjs/router";
import { Icon, Sidebar, ThemeToggle } from "@simplysm/solid";
import { env } from "@simplysm/core-common";
import { IconUser } from "@tabler/icons-solidjs";
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
          menus={[
            { title: "설정", onClick: () => alert("설정") },
            { title: "로그아웃", onClick: () => navigate("/login") },
          ]}
        >
          <div class="relative flex flex-1 items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-full bg-primary-500 text-white">
              <Icon icon={IconUser} class="size-6" />
            </div>
            <div class="flex flex-col">
              <span class="font-semibold">홍길동</span>
              <span class="text-sm text-base-500 dark:text-base-400">hong@example.com</span>
            </div>
          </div>
        </Sidebar.User>
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
