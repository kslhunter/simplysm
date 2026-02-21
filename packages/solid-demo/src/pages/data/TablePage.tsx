import { For } from "solid-js";
import { Table, Tag } from "@simplysm/solid";

const sampleData = [
  { id: 1, name: "홍길동", email: "hong@example.com", role: "관리자", status: "활성" },
  { id: 2, name: "김철수", email: "kim@example.com", role: "사용자", status: "활성" },
  { id: 3, name: "이영희", email: "lee@example.com", role: "사용자", status: "비활성" },
  { id: 4, name: "박민수", email: "park@example.com", role: "편집자", status: "활성" },
  { id: 5, name: "최지영", email: "choi@example.com", role: "사용자", status: "대기" },
];

export default function TablePage() {
  return (
    <div class="space-y-8 p-6">
      {/* 기본 (inline) */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">기본 테이블</h2>
        <Table>
          <thead>
            <tr>
              <th>키</th>
              <th>값</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>A</td>
              <td>100</td>
            </tr>
            <tr>
              <td>B</td>
              <td>200</td>
            </tr>
          </tbody>
        </Table>
      </section>

      {/* w-full */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">전체 너비 테이블</h2>
        <Table class="w-full">
          <thead>
            <tr>
              <th>ID</th>
              <th>이름</th>
              <th>이메일</th>
              <th>역할</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            <For each={sampleData}>
              {(row) => (
                <tr class="hover:bg-base-50 dark:hover:bg-base-800/50">
                  <td>{row.id}</td>
                  <td>{row.name}</td>
                  <td>{row.email}</td>
                  <td>{row.role}</td>
                  <td>
                    <Tag
                      theme={
                        row.status === "활성"
                          ? "success"
                          : row.status === "비활성"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {row.status}
                    </Tag>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </Table>
      </section>

      {/* Inset */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Inset 테이블</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          inset prop을 사용하면 외곽 테두리가 제거됩니다.
        </p>

        <Table inset class="w-full">
          <thead>
            <tr>
              <th>항목</th>
              <th>값</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>서버</td>
              <td>production-01</td>
            </tr>
            <tr>
              <td>상태</td>
              <td>정상</td>
            </tr>
            <tr>
              <td>업타임</td>
              <td>99.9%</td>
            </tr>
          </tbody>
        </Table>
      </section>
    </div>
  );
}
