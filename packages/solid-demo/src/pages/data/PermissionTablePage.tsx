import { createSignal } from "solid-js";
import { type AppPerm, PermissionTable } from "@simplysm/solid";

const demoItems: AppPerm[] = [
  {
    title: "User Management",
    href: "/user",
    perms: ["use", "edit"],
    children: [
      { title: "Permission Settings", href: "/user/permission", perms: ["use", "edit", "approve"] },
      { title: "User List", href: "/user/list", perms: ["use", "edit"] },
    ],
  },
  {
    title: "Board",
    href: "/board",
    perms: ["use", "edit"],
    children: [
      { title: "Announcements", href: "/board/notice", perms: ["use", "edit"] },
      { title: "Free Board", href: "/board/free", perms: ["use"] },
    ],
  },
  {
    title: "System",
    href: "/system",
    perms: ["use"],
    modules: ["admin"],
  },
];

export default function PermissionTablePage() {
  const [value, setValue] = createSignal<Record<string, boolean>>({});

  return (
    <div class="space-y-8 p-6">
      {/* Basic */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          Basic PermissionTable
        </h2>
        <PermissionTable items={demoItems} value={value()} onValueChange={setValue} />
      </section>

      {/* Modules filter applied */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Module Filter (admin)</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          When you pass modules={`["admin"]`}, only items belonging to that module are displayed.
        </p>
        <PermissionTable
          items={demoItems}
          value={value()}
          onValueChange={setValue}
          modules={["admin"]}
        />
      </section>

      {/* disabled */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Disabled State</h2>
        <PermissionTable items={demoItems} value={value()} disabled />
      </section>

      {/* Current value */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Current Value</h2>
        <pre class="overflow-auto rounded bg-base-100 p-2 text-xs dark:bg-base-800">
          {JSON.stringify(value(), null, 2)}
        </pre>
      </section>
    </div>
  );
}
