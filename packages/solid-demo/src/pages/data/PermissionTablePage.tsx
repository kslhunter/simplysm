import { createSignal } from "solid-js";
import { type PermissionItem, PermissionTable, Topbar } from "@simplysm/solid";

const demoItems: PermissionItem[] = [
  {
    title: "사용자 관리",
    href: "/user",
    perms: ["use", "edit"],
    children: [
      { title: "권한 설정", href: "/user/permission", perms: ["use", "edit", "approve"] },
      { title: "사용자 목록", href: "/user/list", perms: ["use", "edit"] },
    ],
  },
  {
    title: "게시판",
    href: "/board",
    perms: ["use", "edit"],
    children: [
      { title: "공지사항", href: "/board/notice", perms: ["use", "edit"] },
      { title: "자유게시판", href: "/board/free", perms: ["use"] },
    ],
  },
  {
    title: "시스템",
    href: "/system",
    perms: ["use"],
    modules: ["admin"],
  },
];

export default function PermissionTablePage() {
  const [value, setValue] = createSignal<Record<string, boolean>>({});

  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">PermissionTable</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* 기본 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">기본 PermissionTable</h2>
            <PermissionTable items={demoItems} value={value()} onValueChange={setValue} />
          </section>

          {/* modules 필터 적용 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">모듈 필터 (admin)</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              modules={`["admin"]`}을 전달하면 해당 모듈에 속한 항목만 표시됩니다.
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
            <h2 class="mb-4 text-xl font-semibold">비활성 상태</h2>
            <PermissionTable items={demoItems} value={value()} disabled />
          </section>

          {/* 현재 값 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">현재 값</h2>
            <pre class="overflow-auto rounded bg-base-100 p-2 text-xs dark:bg-base-800">
              {JSON.stringify(value(), null, 2)}
            </pre>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
