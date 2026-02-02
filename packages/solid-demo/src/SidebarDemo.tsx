import { Route, useNavigate } from "@solidjs/router";
import {
  Button,
  Sidebar,
  SidebarContainer,
  SidebarMenu,
  SidebarUser,
  useSidebarContext,
  type SidebarMenuItem,
} from "@simplysm/solid";
import {
  IconDashboard,
  IconFile,
  IconFolder,
  IconHome,
  IconMenu2,
  IconSettings,
  IconUser,
  IconUsers,
} from "@tabler/icons-solidjs";

const menuItems: SidebarMenuItem[] = [
  {
    title: "대시보드",
    href: "/sidebar/dashboard",
    icon: IconDashboard,
  },
  {
    title: "홈",
    href: "/sidebar/home",
    icon: IconHome,
  },
  {
    title: "사용자 관리",
    icon: IconUsers,
    children: [
      {
        title: "사용자 목록",
        href: "/sidebar/users",
        icon: IconUser,
      },
      {
        title: "역할 관리",
        href: "/sidebar/roles",
        icon: IconSettings,
      },
    ],
  },
  {
    title: "문서",
    icon: IconFolder,
    children: [
      {
        title: "가이드",
        href: "/sidebar/docs/guide",
        icon: IconFile,
      },
      {
        title: "API 문서",
        href: "/sidebar/docs/api",
        icon: IconFile,
      },
      {
        title: "하위 폴더",
        icon: IconFolder,
        children: [
          {
            title: "파일 1",
            href: "/sidebar/docs/sub/file1",
            icon: IconFile,
          },
          {
            title: "파일 2",
            href: "/sidebar/docs/sub/file2",
            icon: IconFile,
          },
        ],
      },
    ],
  },
  {
    title: "외부 링크",
    href: "https://github.com/kslhunter/simplysm",
    icon: IconHome,
  },
];

const SidebarContent = () => {
  const navigate = useNavigate();

  const userMenus = [
    { title: "프로필", onClick: () => navigate("/sidebar/profile") },
    { title: "설정", onClick: () => navigate("/sidebar/settings") },
    { title: "로그아웃", onClick: () => alert("로그아웃!") },
  ];

  return (
    <>
      <SidebarUser menus={userMenus}>
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-full bg-primary-500 text-white">
            <IconUser class="size-6" />
          </div>
          <div class="flex flex-col">
            <span class="font-semibold">홍길동</span>
            <span class="text-sm text-gray-500">hong@example.com</span>
          </div>
        </div>
      </SidebarUser>
      <SidebarMenu menus={menuItems} />
    </>
  );
};

const SidebarToggleButton = () => {
  const { setToggle } = useSidebarContext();

  return (
    <Button variant="ghost" onClick={() => setToggle((v) => !v)} class="p-2">
      <IconMenu2 class="size-6" />
    </Button>
  );
};

const PageContent = (props: { title: string }) => {
  return (
    <main class="flex-1 p-6">
      <div class="mb-4 flex items-center gap-4">
        <SidebarToggleButton />
        <h1 class="text-2xl font-bold">{props.title}</h1>
      </div>
      <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <p class="text-gray-600 dark:text-gray-400">
          현재 페이지: <strong>{props.title}</strong>
        </p>
        <p class="mt-2 text-sm text-gray-500">
          사이드바 메뉴를 클릭하여 다른 페이지로 이동해 보세요.
        </p>
        <p class="mt-2 text-sm text-gray-500">
          화면 크기를 640px 미만으로 줄이면 모바일 모드로 전환됩니다.
        </p>
      </div>
    </main>
  );
};

export const SidebarDemo = () => {
  return (
    <SidebarContainer>
      <Sidebar>
        <SidebarContent />
      </Sidebar>

      <Route path="/" component={() => <PageContent title="Sidebar Demo" />} />
      <Route path="/dashboard" component={() => <PageContent title="대시보드" />} />
      <Route path="/home" component={() => <PageContent title="홈" />} />
      <Route path="/users" component={() => <PageContent title="사용자 목록" />} />
      <Route path="/roles" component={() => <PageContent title="역할 관리" />} />
      <Route path="/docs/guide" component={() => <PageContent title="가이드" />} />
      <Route path="/docs/api" component={() => <PageContent title="API 문서" />} />
      <Route path="/docs/sub/file1" component={() => <PageContent title="파일 1" />} />
      <Route path="/docs/sub/file2" component={() => <PageContent title="파일 2" />} />
      <Route path="/profile" component={() => <PageContent title="프로필" />} />
      <Route path="/settings" component={() => <PageContent title="설정" />} />
    </SidebarContainer>
  );
};
