import { createSignal, onMount, Show, Suspense } from "solid-js";
import { type RouteSectionProps, useLocation, useNavigate } from "@solidjs/router";
import {
  BusyContainer,
  NotificationBell,
  Sidebar,
  ThemeToggle,
  Topbar,
  useNotification,
} from "@simplysm/solid";
import { env } from "@simplysm/core-common";
import { useAuth } from "../../providers/AuthProvider";
import { useAppService } from "../../providers/AppServiceProvider";
import { useAppStructure } from "../../providers/AppStructureProvider";

function HomeContent(props: RouteSectionProps) {
  const auth = useAuth();
  const appService = useAppService();
  const navigate = useNavigate();
  const location = useLocation();
  const noti = useNotification();
  const appStructure = useAppStructure();

  const [ready, setReady] = createSignal(false);

  const titleChain = () => {
    const chain = appStructure.getTitleChainByHref(location.pathname);
    // 최상위 그룹(홈) 제외
    return chain.length > 1 ? chain.slice(1) : chain;
  };

  const employeeMenus = [
    {
      title: "설정",
      onClick: () => navigate("/home/my-info"),
    },
    {
      title: "로그아웃",
      onClick: () => {
        auth.logout();
        navigate("/login", { replace: true });
      },
    },
  ];

  onMount(async () => {
    try {
      // 1. Check auth - reload token only if not already authenticated
      if (!auth.authInfo()) {
        const authOk = await auth.tryReloadAuth();
        if (!authOk) {
          navigate("/login", { replace: true });
          return;
        }
      }

      await appService.orm.connectWithoutTransaction(async (db) => {
        await db.initialize();
      });

      setReady(true);
    } catch (err) {
      noti.error(err, "초기화 실패");
    }
  });

  return (
    <BusyContainer ready={ready()}>
      <Sidebar.Container>
        <Sidebar>
          <div class="p-2 px-4">
            <img src="assets/logo-landscape.png" alt="SIMPLYSM" class="h-9 w-auto" />
          </div>
          <Sidebar.User
            name={auth.authInfo()?.employeeName ?? ""}
            description={auth.authInfo()?.email ?? ""}
            menus={employeeMenus}
          />
          <Sidebar.Menu menus={appStructure.usableMenus()} class="flex-1" />
          <div class="pointer-events-none px-2 py-1 text-sm text-black/30 dark:text-white/30">
            v{env.VER}
            <Show when={env.DEV}>(dev)</Show>
          </div>
        </Sidebar>

        <Topbar.Container>
          <Topbar>
            <span class="ml-2 mr-6 text-lg font-bold">{titleChain().join(" > ")}</span>
            <Topbar.Actions />
            <div class="flex-1" />
            <NotificationBell />
            <ThemeToggle size="sm" />
          </Topbar>

          <main class="flex-1 overflow-auto">
            <Suspense fallback={<BusyContainer ready={false} />}>
              {props.children}
            </Suspense>
          </main>
        </Topbar.Container>
      </Sidebar.Container>
    </BusyContainer>
  );
}

export function HomeView(props: RouteSectionProps) {
  return <HomeContent {...props} />;
}
