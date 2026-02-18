import { type ParentProps, Suspense } from "solid-js";
import { IconComponents, IconHome } from "@tabler/icons-solidjs";
import {
  Sidebar,
  SidebarContainer,
  SidebarMenu,
  type SidebarMenuItem,
  SidebarUser,
} from "@simplysm/solid";
import { atoms } from "@simplysm/solid/styles";

const menus: SidebarMenuItem[] = [
  { title: "홈", path: "/", icon: IconHome },
  {
    title: "컴포넌트",
    icon: IconComponents,
    children: [
      { title: "Button", path: "/button" },
      { title: "Checkbox", path: "/choice" },
      { title: "Dropdown", path: "/dropdown" },
      { title: "Field", path: "/field" },
      { title: "List", path: "/list" },
      { title: "Radio", path: "/radio" },
      { title: "Sidebar", path: "/sidebar" },
      { title: "Topbar", path: "/topbar" },
    ],
  },
];

export default function Home(props: ParentProps) {
  const userMenus = () => [
    {
      title: "프로필 설정",
      onClick: () => {
        alert("프로필 설정 클릭");
      },
    },
    {
      title: "로그아웃",
      onClick: () => {
        alert("로그아웃 클릭");
      },
    },
  ];

  return (
    <SidebarContainer>
      <Sidebar>
        {/* Brand */}
        <div class={atoms({ py: "lg", pl: "lg", pr: "xxxxl" })}>
          <img src="logo-landscape.png" alt="SIMPLYSM" class={atoms({ width: "full" })} />
        </div>

        {/* User */}
        <SidebarUser name="홍길동" description="admin@example.com" menus={userMenus()} />

        {/* Menu */}
        <SidebarMenu layout={"accordion"} menus={menus} />
      </Sidebar>

      <div
        style={{
          "flex": 1,
          "overflow": "hidden",
          "height": "100%",
          "display": "flex",
          "flex-direction": "column",
        }}
      >
        <Suspense fallback={<div class={atoms({ p: "xxl" })}>로딩 중...</div>}>
          {props.children}
        </Suspense>
      </div>
    </SidebarContainer>
  );
}
