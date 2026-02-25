import { createSignal } from "solid-js";
import { Button, FormTable, TextInput, NumberInput, Select } from "@simplysm/solid";

export default function FormTablePage() {
  const [controlledName, setControlledName] = createSignal("");
  const [controlledSalary, setControlledSalary] = createSignal<number>();

  return (
    <div class="space-y-8 p-6">
      {/* Basic FormTable */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Basic FormTable</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          FormTable is used to arrange forms in label-value format with a table layout.
        </p>
        <FormTable>
          <tbody>
            <tr>
              <th>Name</th>
              <td>
                <TextInput placeholder="Enter name" />
              </td>
            </tr>
            <tr>
              <th>Department</th>
              <td>
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
              </td>
            </tr>
            <tr>
              <th>Position</th>
              <td>
                <TextInput placeholder="Enter position" />
              </td>
            </tr>
            <tr>
              <th>Salary</th>
              <td>
                <NumberInput placeholder="Enter salary" />
              </td>
            </tr>
          </tbody>
        </FormTable>
      </section>

      {/* Colspan */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Using Colspan</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          You can create complex layouts using colspan.
        </p>
        <FormTable>
          <tbody>
            <tr>
              <th>Title</th>
              <td colspan="3">
                <TextInput placeholder="Enter title" />
              </td>
            </tr>
            <tr>
              <th>Category</th>
              <td>
                <Select
                  placeholder="Select"
                  renderValue={(v: string) => <>{v === "notice" ? "Announcement" : "News"}</>}
                >
                  <Select.Item value="notice">Announcement</Select.Item>
                  <Select.Item value="news">News</Select.Item>
                </Select>
              </td>
              <th>Author</th>
              <td>
                <TextInput placeholder="Author" />
              </td>
            </tr>
          </tbody>
        </FormTable>
      </section>

      {/* Read-only information */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Read-Only Information</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          You can also use FormTable to display information only without input fields.
        </p>
        <FormTable>
          <tbody>
            <tr>
              <th>User ID</th>
              <td>user123</td>
            </tr>
            <tr>
              <th>Name</th>
              <td>John Doe</td>
            </tr>
            <tr>
              <th>Email</th>
              <td>john@example.com</td>
            </tr>
            <tr>
              <th>Joined</th>
              <td>2024-01-15</td>
            </tr>
            <tr>
              <th>Status</th>
              <td>
                <span class="text-success-600 dark:text-success-400">Active</span>
              </td>
            </tr>
          </tbody>
        </FormTable>
      </section>

      {/* Controlled */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Controlled</h2>
        <div class="space-y-4">
          <FormTable>
            <tbody>
              <tr>
                <th>이름</th>
                <td>
                  <TextInput
                    value={controlledName()}
                    onValueChange={setControlledName}
                    placeholder="이름을 입력하세요"
                  />
                </td>
              </tr>
              <tr>
                <th>급여</th>
                <td>
                  <NumberInput
                    value={controlledSalary()}
                    onValueChange={setControlledSalary}
                    placeholder="급여를 입력하세요"
                  />
                </td>
              </tr>
            </tbody>
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
