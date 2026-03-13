import { For } from "solid-js";
import { Table, Tag } from "@simplysm/solid";

const sampleData = [
  { id: 1, name: "John Doe", email: "john@example.com", role: "Admin", status: "Active" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", role: "User", status: "Active" },
  { id: 3, name: "Bob Wilson", email: "bob@example.com", role: "User", status: "Inactive" },
  { id: 4, name: "Alice Johnson", email: "alice@example.com", role: "Editor", status: "Active" },
  { id: 5, name: "Charlie Brown", email: "charlie@example.com", role: "User", status: "Pending" },
];

export function TableView() {
  return (
    <div class="space-y-8 p-4">
      {/* Basic (inline) */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Basic Table</h2>
        <Table>
          <thead>
            <Table.Row>
              <Table.HeaderCell>Key</Table.HeaderCell>
              <Table.HeaderCell>Value</Table.HeaderCell>
            </Table.Row>
          </thead>
          <tbody>
            <Table.Row>
              <Table.Cell>A</Table.Cell>
              <Table.Cell>100</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>B</Table.Cell>
              <Table.Cell>200</Table.Cell>
            </Table.Row>
          </tbody>
        </Table>
      </section>

      {/* w-full */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Full Width Table</h2>
        <Table class="w-full">
          <thead>
            <Table.Row>
              <Table.HeaderCell>ID</Table.HeaderCell>
              <Table.HeaderCell>Name</Table.HeaderCell>
              <Table.HeaderCell>Email</Table.HeaderCell>
              <Table.HeaderCell>Role</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
            </Table.Row>
          </thead>
          <tbody>
            <For each={sampleData}>
              {(row) => (
                <Table.Row class="hover:bg-base-50 dark:hover:bg-base-800/50">
                  <Table.Cell>{row.id}</Table.Cell>
                  <Table.Cell>{row.name}</Table.Cell>
                  <Table.Cell>{row.email}</Table.Cell>
                  <Table.Cell>{row.role}</Table.Cell>
                  <Table.Cell>
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
                  </Table.Cell>
                </Table.Row>
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
            <Table.Row>
              <Table.HeaderCell>Item</Table.HeaderCell>
              <Table.HeaderCell>Value</Table.HeaderCell>
            </Table.Row>
          </thead>
          <tbody>
            <Table.Row>
              <Table.Cell>Server</Table.Cell>
              <Table.Cell>production-01</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>Status</Table.Cell>
              <Table.Cell>Healthy</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>Uptime</Table.Cell>
              <Table.Cell>99.9%</Table.Cell>
            </Table.Row>
          </tbody>
        </Table>
      </section>
    </div>
  );
}
