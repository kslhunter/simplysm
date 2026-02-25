import { For } from "solid-js";
import { Table, Tag } from "@simplysm/solid";

const sampleData = [
  { id: 1, name: "John Doe", email: "john@example.com", role: "Admin", status: "Active" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", role: "User", status: "Active" },
  { id: 3, name: "Bob Wilson", email: "bob@example.com", role: "User", status: "Inactive" },
  { id: 4, name: "Alice Johnson", email: "alice@example.com", role: "Editor", status: "Active" },
  { id: 5, name: "Charlie Brown", email: "charlie@example.com", role: "User", status: "Pending" },
];

export default function TablePage() {
  return (
    <div class="space-y-8 p-6">
      {/* Basic (inline) */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Basic Table</h2>
        <Table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Value</th>
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
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Full Width Table</h2>
        <Table class="w-full">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
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
                        row.status === "Active"
                          ? "success"
                          : row.status === "Inactive"
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
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Inset Table</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Using the inset prop removes the outer border.
        </p>

        <Table inset class="w-full">
          <thead>
            <tr>
              <th>Item</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Server</td>
              <td>production-01</td>
            </tr>
            <tr>
              <td>Status</td>
              <td>Healthy</td>
            </tr>
            <tr>
              <td>Uptime</td>
              <td>99.9%</td>
            </tr>
          </tbody>
        </Table>
      </section>
    </div>
  );
}
