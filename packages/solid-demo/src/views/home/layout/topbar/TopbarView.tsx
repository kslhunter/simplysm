import {
  Button,
  Sidebar,
  Topbar,
  useTopbarActions,
  type AppMenu,
  type TopbarMenuItem,
  type TopbarUserMenu,
} from "@simplysm/solid";
import {
  IconDatabase,
  IconFolder,
  IconHome,
  IconServer,
  IconSettings,
  IconUsers,
} from "@tabler/icons-solidjs";

// Simple menu (2 levels)
const simpleMenus: TopbarMenuItem[] = [
  {
    title: "Administration",
    children: [{ title: "User Management" }, { title: "Permission Settings" }],
  },
  {
    title: "Help",
    children: [{ title: "Guide" }, { title: "Information" }],
  },
];

// Nested menu (3+ levels, with icons)
const nestedMenus: TopbarMenuItem[] = [
  {
    title: "Administration",
    icon: IconSettings,
    children: [
      { title: "User Management", icon: IconUsers },
      {
        title: "System",
        icon: IconServer,
        children: [
          { title: "Server Settings" },
          { title: "Database", icon: IconDatabase },
          {
            title: "Advanced Settings",
            children: [{ title: "Cache" }, { title: "Logs" }],
          },
        ],
      },
    ],
  },
  {
    title: "Documents",
    icon: IconFolder,
    children: [{ title: "Getting Started" }, { title: "API Reference" }],
  },
];

// Menu for TopbarUser
const userMenus: TopbarUserMenu[] = [
  { title: "Profile", onClick: () => alert("Profile") },
  { title: "Logout", onClick: () => alert("Logout") },
];

// Menu for Sidebar + Topbar integration
const sidebarMenus: AppMenu[] = [
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

// Sub-page simulation component
function UserPageSimulation() {
  useTopbarActions(() => (
    <div class="flex gap-1">
      <Button size="sm" theme="success">
        Save
      </Button>
      <Button size="sm" theme="danger" variant="outline">
        Delete
      </Button>
    </div>
  ));
  return (
    <p>
      This page registers Save/Delete buttons via useTopbarActions
    </p>
  );
}

export function TopbarView() {
  return (
    <div class="space-y-8 p-4">
      {/* 1. TopbarContainer basic */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          TopbarContainer Basic
        </h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          TopbarContainer arranges Topbar + content vertically. When used standalone without SidebarContext, no toggle button is displayed.
        </p>
        <div class="h-48 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
          <Topbar.Container>
            <Topbar>
              <h1>Page Title</h1>
            </Topbar>
            <div class="flex-1 overflow-auto p-4">
              <p>Main Content Area</p>
            </div>
          </Topbar.Container>
        </div>
      </section>

      {/* 2. Toggle button auto-linking */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          Toggle Button Auto-linking
        </h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Comparison of standalone use without SidebarContext vs use inside SidebarContainer. When used inside SidebarContainer, the toggle button is automatically displayed.
        </p>
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <p>Standalone Use (No Toggle Button)</p>
            <div class="h-48 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
              <Topbar.Container>
                <Topbar>
                  <h1>No Toggle Button</h1>
                </Topbar>
                <div class="flex-1 overflow-auto p-4">
                  <p>No SidebarContext</p>
                </div>
              </Topbar.Container>
            </div>
          </div>
          <div>
            <p>
              Use Inside SidebarContainer (With Toggle Button)
            </p>
            <div class="h-48 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
              <Sidebar.Container>
                <Sidebar>
                  <div>LOGO</div>
                </Sidebar>
                <Topbar.Container>
                  <Topbar>
                    <h1>Toggle Button Auto-displayed</h1>
                  </Topbar>
                  <div class="flex-1 overflow-auto p-4">
                    <p>With SidebarContext</p>
                  </div>
                </Topbar.Container>
              </Sidebar.Container>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TopbarMenu variants */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">TopbarMenu Variants</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          TopbarMenu provides dropdown menus. Unlimited nesting is supported.
        </p>
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <p>Simple Menu (2 Levels)</p>
            <div class="h-48 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
              <Topbar.Container>
                <Topbar>
                  <Topbar.Menu menus={simpleMenus} />
                </Topbar>
                <div class="flex-1 overflow-auto p-4">
                  <p>Try clicking the menu</p>
                </div>
              </Topbar.Container>
            </div>
          </div>
          <div>
            <p>
              Nested Menu (3+ Levels, With Icons)
            </p>
            <div class="h-48 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
              <Topbar.Container>
                <Topbar>
                  <Topbar.Menu menus={nestedMenus} />
                </Topbar>
                <div class="flex-1 overflow-auto p-4">
                  <p>
                    Check Administration → System → Advanced Settings
                  </p>
                </div>
              </Topbar.Container>
            </div>
          </div>
        </div>
      </section>

      {/* 4. TopbarUser variants */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">TopbarUser Variants</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          TopbarUser provides user menu dropdown.
        </p>
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <p>Basic (Name Only)</p>
            <div class="h-48 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
              <Topbar.Container>
                <Topbar>
                  <h1>Title</h1>
                  <div class="flex-1" />
                  <Topbar.User>Hong Gildong</Topbar.User>
                </Topbar>
                <div class="flex-1 overflow-auto p-4">
                  <p>Show name only without menu</p>
                </div>
              </Topbar.Container>
            </div>
          </div>
          <div>
            <p>With Menu</p>
            <div class="h-48 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
              <Topbar.Container>
                <Topbar>
                  <h1>Title</h1>
                  <div class="flex-1" />
                  <Topbar.User menus={userMenus}>Hong Gildong</Topbar.User>
                </Topbar>
                <div class="flex-1 overflow-auto p-4">
                  <p>
                    Click to show Profile/Logout menu
                  </p>
                </div>
              </Topbar.Container>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Sidebar + Topbar integration */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          Sidebar + Topbar Integration
        </h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          When TopbarContainer is used inside SidebarContainer, the toggle button is automatically linked.
        </p>
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <p>
              Sidebar Open (toggled=false)
            </p>
            <div class="h-80 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
              <Sidebar.Container>
                <Sidebar>
                  <div>LOGO</div>
                  <Sidebar.User
                    name="Hong Gildong"
                    description="hong@example.com"
                    menus={[
                      { title: "Profile", onClick: () => alert("Profile") },
                      { title: "Logout", onClick: () => alert("Logout") },
                    ]}
                  />
                  <Sidebar.Menu menus={sidebarMenus} />
                </Sidebar>
                <Topbar.Container>
                  <Topbar>
                    <h1>Page</h1>
                    <div class="flex-1" />
                    <Topbar.User menus={userMenus}>Hong Gildong</Topbar.User>
                  </Topbar>
                  <div class="flex-1 overflow-auto p-4">
                    <p>
                      Try clicking the toggle button
                    </p>
                  </div>
                </Topbar.Container>
              </Sidebar.Container>
            </div>
          </div>
          <div>
            <p>
              Sidebar Closed (toggled=true)
            </p>
            <div class="h-80 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
              <Sidebar.Container>
                <Sidebar>
                  <div>LOGO</div>
                  <Sidebar.Menu menus={sidebarMenus} />
                </Sidebar>
                <Topbar.Container>
                  <Topbar>
                    <h1>Page</h1>
                    <div class="flex-1" />
                    <Topbar.User menus={userMenus}>Hong Gildong</Topbar.User>
                  </Topbar>
                  <div class="flex-1 overflow-auto p-4">
                    <p>
                      Try clicking the toggle button
                    </p>
                  </div>
                </Topbar.Container>
              </Sidebar.Container>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Mobile demo */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Mobile Demo</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Simulate mobile environment with 375px x 500px iframe
        </p>
        <div class="h-[500px] w-[375px] overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
          <iframe
            src="#/mobile-layout-demo"
            style={{ width: "100%", height: "100%", border: "none" }}
            title="Mobile Layout Demo"
          />
        </div>
      </section>

      {/* 7. Topbar.Actions slot */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          Topbar.Actions slot
        </h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Inject action buttons to the Topbar via useTopbarActions() from child pages. Topbar.Actions acts as a slot outlet.
        </p>
        <div class="h-48 overflow-hidden rounded-lg border border-base-200 dark:border-base-700">
          <Topbar.Container>
            <Topbar>
              <h1>User Management</h1>
              <Topbar.Actions />
              <div class="flex-1" />
              <Topbar.User>Hong Gildong</Topbar.User>
            </Topbar>
            <div class="flex-1 overflow-auto p-4">
              <UserPageSimulation />
            </div>
          </Topbar.Container>
        </div>
      </section>
    </div>
  );
}
