import { Button, Icon, Sidebar, useSidebarContext, type AppMenu } from "@simplysm/solid";
import { IconFolder, IconHome, IconMenu2, IconSettings } from "@tabler/icons-solidjs";

const sampleMenuItems: AppMenu[] = [
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

const SidebarToggleButton = () => {
  const { setToggle } = useSidebarContext();
  return (
    <Button variant="ghost" onClick={() => setToggle((v) => !v)}>
      <Icon icon={IconMenu2} class="size-6" />
    </Button>
  );
};

export default function SidebarPage() {
  return (
    <div class="space-y-8 p-6">
      {/* 1. Basic Sidebar */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Basic Sidebar</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Combination of Sidebar + SidebarMenu + SidebarUser. Click the toggle button to open and close the sidebar.
        </p>
        <div class="h-96 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
          <Sidebar.Container>
            <Sidebar>
              <div class="p-2 px-4 font-bold">LOGO</div>
              <Sidebar.User
                name="Hong Gildong"
                description="hong@example.com"
                menus={[
                  { title: "Profile", onClick: () => alert("Profile") },
                  { title: "Settings", onClick: () => alert("Settings") },
                  { title: "Logout", onClick: () => alert("Logout") },
                ]}
              />
              <Sidebar.Menu menus={sampleMenuItems} />
            </Sidebar>
            <main class="h-full overflow-auto p-4">
              <div class="mb-4 flex items-center gap-4">
                <SidebarToggleButton />
                <span class="font-medium">Content Area</span>
              </div>
              <div class="rounded border border-base-200 bg-base-50 p-4 dark:border-base-700 dark:bg-base-800">
                <p class="text-sm text-base-600 dark:text-base-400">
                  Click the sidebar menu to navigate to that path.
                </p>
              </div>
            </main>
          </Sidebar.Container>
        </div>
      </section>

      {/* 2. Toggled state */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Toggled State</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Control the sidebar toggle state through useSidebarContext().setToggle().
        </p>
        <div class="h-96 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
          <Sidebar.Container>
            <Sidebar>
              <div class="p-2 px-4 font-bold">LOGO</div>
              <Sidebar.Menu menus={sampleMenuItems} />
            </Sidebar>
            <main class="h-full overflow-auto p-4">
              <div class="mb-4 flex items-center gap-4">
                <SidebarToggleButton />
                <span class="font-medium">Control State with Toggle Button</span>
              </div>
              <div class="rounded border border-base-200 bg-base-50 p-4 dark:border-base-700 dark:bg-base-800">
                <p class="text-sm text-base-600 dark:text-base-400">
                  Clicking the toggle button calls useSidebarContext().setToggle().
                </p>
              </div>
            </main>
          </Sidebar.Container>
        </div>
      </section>

      {/* 3. SidebarUser variants */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">SidebarUser Variants</h2>
        <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* None */}
          <div>
            <p class="mb-2 text-sm text-base-600 dark:text-base-400">None</p>
            <div class="h-80 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
              <Sidebar.Container>
                <Sidebar>
                  <div class="p-2 px-4 font-bold">LOGO</div>
                  <Sidebar.Menu menus={sampleMenuItems} />
                </Sidebar>
                <main class="h-full overflow-auto p-4">
                  <SidebarToggleButton />
                  <div class="mt-4 rounded border border-base-200 bg-base-50 p-4 dark:border-base-700 dark:bg-base-800">
                    <p class="text-sm text-base-600 dark:text-base-400">No SidebarUser</p>
                  </div>
                </main>
              </Sidebar.Container>
            </div>
          </div>

          {/* Basic (no menu) */}
          <div>
            <p class="mb-2 text-sm text-base-600 dark:text-base-400">Basic (No Menu)</p>
            <div class="h-80 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
              <Sidebar.Container>
                <Sidebar>
                  <div class="p-2 px-4 font-bold">LOGO</div>
                  <Sidebar.User name="Hong Gildong" description="hong@example.com" />
                  <Sidebar.Menu menus={sampleMenuItems} />
                </Sidebar>
                <main class="h-full overflow-auto p-4">
                  <SidebarToggleButton />
                  <div class="mt-4 rounded border border-base-200 bg-base-50 p-4 dark:border-base-700 dark:bg-base-800">
                    <p class="text-sm text-base-600 dark:text-base-400">
                      Show user information only without menu
                    </p>
                  </div>
                </main>
              </Sidebar.Container>
            </div>
          </div>

          {/* With menu */}
          <div>
            <p class="mb-2 text-sm text-base-600 dark:text-base-400">With Menu</p>
            <div class="h-80 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
              <Sidebar.Container>
                <Sidebar>
                  <div class="p-2 px-4 font-bold">LOGO</div>
                  <Sidebar.User
                    name="Hong Gildong"
                    description="admin@example.com"
                    menus={[
                      { title: "Profile", onClick: () => alert("Profile") },
                      { title: "Logout", onClick: () => alert("Logout") },
                    ]}
                  />
                  <Sidebar.Menu menus={sampleMenuItems} />
                </Sidebar>
                <main class="h-full overflow-auto p-4">
                  <SidebarToggleButton />
                  <div class="mt-4 rounded border border-base-200 bg-base-50 p-4 dark:border-base-700 dark:bg-base-800">
                    <p class="text-sm text-base-600 dark:text-base-400">
                      Click to show dropdown menu
                    </p>
                  </div>
                </main>
              </Sidebar.Container>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Mobile demo */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Mobile Demo</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Simulate mobile environment with 375px x 500px iframe
        </p>
        <div class="h-[500px] w-[375px] overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
          <iframe
            src="#/mobile-layout-demo"
            style={{ width: "100%", height: "100%", border: "none" }}
            title="Mobile Sidebar Demo"
          />
        </div>
      </section>
    </div>
  );
}
