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
            <Table.Tr>
              <Table.Th>Key</Table.Th>
              <Table.Th>Value</Table.Th>
            </Table.Tr>
          </thead>
          <tbody>
            <Table.Tr>
              <Table.Td>A</Table.Td>
              <Table.Td>100</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>B</Table.Td>
              <Table.Td>200</Table.Td>
            </Table.Tr>
          </tbody>
        </Table>
      </section>

      {/* w-full */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Full Width Table</h2>
        <Table class="w-full">
          <thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </thead>
          <tbody>
            <For each={sampleData}>
              {(row) => (
                <Table.Tr class="hover:bg-base-50 dark:hover:bg-base-800/50">
                  <Table.Td>{row.id}</Table.Td>
                  <Table.Td>{row.name}</Table.Td>
                  <Table.Td>{row.email}</Table.Td>
                  <Table.Td>{row.role}</Table.Td>
                  <Table.Td>
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
                  </Table.Td>
                </Table.Tr>
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
            <Table.Tr>
              <Table.Th>Item</Table.Th>
              <Table.Th>Value</Table.Th>
            </Table.Tr>
          </thead>
          <tbody>
            <Table.Tr>
              <Table.Td>Server</Table.Td>
              <Table.Td>production-01</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>Status</Table.Td>
              <Table.Td>Healthy</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>Uptime</Table.Td>
              <Table.Td>99.9%</Table.Td>
            </Table.Tr>
          </tbody>
        </Table>
      </section>
    </div>
  );
}
