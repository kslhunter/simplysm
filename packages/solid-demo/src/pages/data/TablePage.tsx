import { For } from "solid-js";
import { Table, Topbar, TopbarContainer, Label } from "@simplysm/solid";

const sampleData = [
  { id: 1, name: "홍길동", email: "hong@example.com", role: "관리자", status: "활성" },
  { id: 2, name: "김철수", email: "kim@example.com", role: "사용자", status: "활성" },
  { id: 3, name: "이영희", email: "lee@example.com", role: "사용자", status: "비활성" },
  { id: 4, name: "박민수", email: "park@example.com", role: "편집자", status: "활성" },
  { id: 5, name: "최지영", email: "choi@example.com", role: "사용자", status: "대기" },
];

const thClass = "border-l border-t border-slate-300 bg-slate-100 px-3 py-2 text-left font-semibold dark:border-slate-600 dark:bg-slate-700";
const tdClass = "border-l border-t border-slate-300 px-3 py-2 dark:border-slate-600";

export default function TablePage() {
  return (
    <TopbarContainer>
      <Topbar>
        <h1 class="m-0 text-base">Table</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* Basic Table */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">기본 테이블</h2>
            <Table>
              <thead>
                <tr>
                  <th class={thClass}>ID</th>
                  <th class={thClass}>이름</th>
                  <th class={thClass}>이메일</th>
                  <th class={thClass}>역할</th>
                  <th class={thClass}>상태</th>
                </tr>
              </thead>
              <tbody>
                <For each={sampleData}>
                  {(row) => (
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td class={tdClass}>{row.id}</td>
                      <td class={tdClass}>{row.name}</td>
                      <td class={tdClass}>{row.email}</td>
                      <td class={tdClass}>{row.role}</td>
                      <td class={tdClass}>
                        <Label
                          theme={row.status === "활성" ? "success" : row.status === "비활성" ? "danger" : "warning"}
                        >
                          {row.status}
                        </Label>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </Table>
          </section>

          {/* Inset Table */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">Inset 테이블</h2>
            <p class="mb-4 text-sm text-slate-600 dark:text-slate-400">
              inset prop을 사용하면 오른쪽/아래 테두리가 제거됩니다.
            </p>
            <div class="rounded border border-slate-300 dark:border-slate-600">
              <Table inset>
                <thead>
                  <tr>
                    <th class={thClass}>항목</th>
                    <th class={thClass}>값</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class={tdClass}>서버</td>
                    <td class={tdClass}>production-01</td>
                  </tr>
                  <tr>
                    <td class={tdClass}>상태</td>
                    <td class={tdClass}>정상</td>
                  </tr>
                  <tr>
                    <td class={tdClass}>업타임</td>
                    <td class={tdClass}>99.9%</td>
                  </tr>
                </tbody>
              </Table>
            </div>
          </section>

          {/* Inline Table */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">Inline 테이블</h2>
            <p class="mb-4 text-sm text-slate-600 dark:text-slate-400">
              inline prop을 사용하면 테이블 너비가 내용에 맞춰집니다.
            </p>
            <Table inline>
              <thead>
                <tr>
                  <th class={thClass}>키</th>
                  <th class={thClass}>값</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class={tdClass}>A</td>
                  <td class={tdClass}>100</td>
                </tr>
                <tr>
                  <td class={tdClass}>B</td>
                  <td class={tdClass}>200</td>
                </tr>
              </tbody>
            </Table>
          </section>

          {/* Combined Props */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">Inset + Inline</h2>
            <div class="inline-block rounded border border-slate-300 dark:border-slate-600">
              <Table inset inline>
                <thead>
                  <tr>
                    <th class={thClass}>속성</th>
                    <th class={thClass}>설명</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class={tdClass}>inset</td>
                    <td class={tdClass}>외곽 테두리 제거</td>
                  </tr>
                  <tr>
                    <td class={tdClass}>inline</td>
                    <td class={tdClass}>내용 너비에 맞춤</td>
                  </tr>
                </tbody>
              </Table>
            </div>
          </section>
        </div>
      </div>
    </TopbarContainer>
  );
}
