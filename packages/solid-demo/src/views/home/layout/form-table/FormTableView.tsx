import { createSignal } from "solid-js";
import { Button, FormTable, TextInput, NumberInput, Select } from "@simplysm/solid";

export function FormTableView() {
  const [controlledName, setControlledName] = createSignal("");
  const [controlledSalary, setControlledSalary] = createSignal<number>();

  return (
    <div class="space-y-8 p-4">
      {/* Basic FormTable */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Basic FormTable</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          FormTable is used to arrange forms in label-value format with a table layout.
        </p>
        <FormTable>
          <FormTable.Row>
            <FormTable.Item label="Name">
              <TextInput placeholder="Enter name" />
            </FormTable.Item>
          </FormTable.Row>
          <FormTable.Row>
            <FormTable.Item label="Department">
              <Select
                placeholder="Select department"
                renderValue={(v: string) => (
                  <>{v === "dev" ? "Development" : v === "design" ? "Design" : "Marketing"}</>
                )}
              >
                <Select.Item value="dev">Development</Select.Item>
                <Select.Item value="design">Design</Select.Item>
                <Select.Item value="marketing">Marketing</Select.Item>
              </Select>
            </FormTable.Item>
          </FormTable.Row>
          <FormTable.Row>
            <FormTable.Item label="Position">
              <TextInput placeholder="Enter position" />
            </FormTable.Item>
          </FormTable.Row>
          <FormTable.Row>
            <FormTable.Item label="Salary">
              <NumberInput placeholder="Enter salary" />
            </FormTable.Item>
          </FormTable.Row>
        </FormTable>
      </section>

      {/* Colspan */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Using Colspan</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          You can create complex layouts using colspan.
        </p>
        <FormTable>
          <FormTable.Row>
            <FormTable.Item label="Title" colspan={3}>
              <TextInput placeholder="Enter title" />
            </FormTable.Item>
          </FormTable.Row>
          <FormTable.Row>
            <FormTable.Item label="Category">
              <Select
                placeholder="Select"
                renderValue={(v: string) => <>{v === "notice" ? "Announcement" : "News"}</>}
              >
                <Select.Item value="notice">Announcement</Select.Item>
                <Select.Item value="news">News</Select.Item>
              </Select>
            </FormTable.Item>
            <FormTable.Item label="Author">
              <TextInput placeholder="Author" />
            </FormTable.Item>
          </FormTable.Row>
        </FormTable>
      </section>

      {/* Read-only information */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Read-Only Information</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          You can also use FormTable to display information only without input fields.
        </p>
        <FormTable>
          <FormTable.Row>
            <FormTable.Item label="User ID">user123</FormTable.Item>
          </FormTable.Row>
          <FormTable.Row>
            <FormTable.Item label="Name">John Doe</FormTable.Item>
          </FormTable.Row>
          <FormTable.Row>
            <FormTable.Item label="Email">john@example.com</FormTable.Item>
          </FormTable.Row>
          <FormTable.Row>
            <FormTable.Item label="Joined">2024-01-15</FormTable.Item>
          </FormTable.Row>
          <FormTable.Row>
            <FormTable.Item label="Status">
              <span class="text-success-600 dark:text-success-400">Active</span>
            </FormTable.Item>
          </FormTable.Row>
        </FormTable>
      </section>

      {/* Controlled */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Controlled</h2>
        <div class="space-y-4">
          <FormTable>
            <FormTable.Row>
              <FormTable.Item label="이름">
                <TextInput
                  value={controlledName()}
                  onValueChange={setControlledName}
                  placeholder="이름을 입력하세요"
                />
              </FormTable.Item>
            </FormTable.Row>
            <FormTable.Row>
              <FormTable.Item label="급여">
                <NumberInput
                  value={controlledSalary()}
                  onValueChange={setControlledSalary}
                  placeholder="급여를 입력하세요"
                />
              </FormTable.Item>
            </FormTable.Row>
          </FormTable>
          <p class="text-sm text-base-600 dark:text-base-400">
            이름:{" "}
            <code class="rounded bg-base-200 px-1 dark:bg-base-700">
              {controlledName() || "(없음)"}
            </code>
            {" / "}
            급여:{" "}
            <code class="rounded bg-base-200 px-1 dark:bg-base-700">
              {controlledSalary() ?? "(없음)"}
            </code>
          </p>
          <div class="flex gap-2">
            <Button
              theme="primary"
              variant="solid"
              size="sm"
              onClick={() => {
                setControlledName("홍길동");
                setControlledSalary(5000000);
              }}
            >
              값 채우기
            </Button>
            <Button
              variant="solid"
              size="sm"
              onClick={() => {
                setControlledName("");
                setControlledSalary(undefined);
              }}
            >
              초기화
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
