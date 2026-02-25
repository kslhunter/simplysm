import { Sidebar, Topbar, type AppMenu } from "@simplysm/solid";
import { IconFolder, IconHome, IconSettings } from "@tabler/icons-solidjs";

const sampleMenus: AppMenu[] = [
  { title: "Home", href: "#", icon: IconHome },
  {
    title: "Documents",
    icon: IconFolder,
    children: [
      { title: "Getting Started", href: "#" },
      { title: "API Reference", href: "#" },
    ],
  },
  { title: "Settings", href: "#", icon: IconSettings },
];

export default function MobileLayoutDemoPage() {
  return (
    <div class="h-full bg-white dark:bg-base-900">
      <Sidebar.Container>
        <Sidebar>
          <div class="p-2 px-4 font-bold">LOGO</div>
          <Sidebar.User
            name="Hong Gildong"
            description="hong@example.com"
            menus={[
              { title: "Profile", onClick: () => alert("Profile") },
              { title: "Logout", onClick: () => alert("Logout") },
            ]}
          />
          <Sidebar.Menu menus={sampleMenus} />
        </Sidebar>
        <Topbar.Container>
          <Topbar>
            <h1 class="m-0 text-base font-bold">Mobile Demo</h1>
            <div class="flex-1" />
            <Topbar.User
              menus={[
                { title: "Profile", onClick: () => alert("Profile") },
                { title: "Logout", onClick: () => alert("Logout") },
              ]}
            >
              Hong Gildong
            </Topbar.User>
          </Topbar>
          <div class="flex-1 overflow-auto p-4">
            <p class="text-sm text-base-600 dark:text-base-400">
              Click the hamburger button to open the sidebar.
            </p>
            <p class="mt-4 text-sm text-base-600 dark:text-base-400">
              Click outside the sidebar to close it.
            </p>
          </div>
        </Topbar.Container>
      </Sidebar.Container>
    </div>
  );
}
