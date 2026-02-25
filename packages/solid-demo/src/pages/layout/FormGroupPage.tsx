import { createSignal } from "solid-js";
import { Button, FormGroup, Icon, NumberInput, Select, TextInput } from "@simplysm/solid";
import { IconSearch } from "@tabler/icons-solidjs";

export default function FormGroupPage() {
  // Signals for controlled example
  const [controlledName, setControlledName] = createSignal("");
  const [controlledEmail, setControlledEmail] = createSignal("");

  return (
    <div class="space-y-8 p-6">
      {/* Basic FormGroup */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Basic FormGroup</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          FormGroup is a container that arranges form fields vertically. Wrap each field with FormGroup.Item.
        </p>
        <FormGroup>
          <FormGroup.Item label="Name">
            <TextInput placeholder="Enter name" />
          </FormGroup.Item>
          <FormGroup.Item label="Email">
            <TextInput placeholder="Enter email" />
          </FormGroup.Item>
          <FormGroup.Item label="Age">
            <NumberInput placeholder="Enter age" />
          </FormGroup.Item>
        </FormGroup>
      </section>

      {/* Inline FormGroup */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Inline FormGroup</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Using inline prop arranges fields horizontally.
        </p>
        <FormGroup inline>
          <FormGroup.Item>
            <Button theme="primary" variant="solid" class="gap-1">
              <Icon icon={IconSearch} />
              Search
            </Button>
          </FormGroup.Item>
          <FormGroup.Item label="Country">
            <Select
              placeholder="Select"
              renderValue={(v: string) => <>{v === "kr" ? "Korea" : v === "us" ? "USA" : "Japan"}</>}
            >
              <Select.Item value="kr">Korea</Select.Item>
              <Select.Item value="us">USA</Select.Item>
              <Select.Item value="jp">Japan</Select.Item>
            </Select>
          </FormGroup.Item>
          <FormGroup.Item label="Search Term">
            <TextInput placeholder="Enter search term" />
          </FormGroup.Item>
        </FormGroup>
      </section>

      {/* Without Labels */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Without Labels</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          When omitting the label in FormGroup.Item, only the field is displayed without a label.
        </p>
        <FormGroup>
          <FormGroup.Item>
            <TextInput placeholder="Title" />
          </FormGroup.Item>
          <FormGroup.Item>
            <TextInput placeholder="Content" />
          </FormGroup.Item>
          <FormGroup.Item>
            <Button theme="primary" variant="solid">
              Save
            </Button>
          </FormGroup.Item>
        </FormGroup>
      </section>

      {/* Mixed Layout */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Mixed Layout</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          You can create complex form layouts by nesting FormGroups.
        </p>
        <FormGroup>
          <FormGroup.Item label="Basic Info">
            <FormGroup inline>
              <FormGroup.Item>
                <TextInput placeholder="Last Name" />
              </FormGroup.Item>
              <FormGroup.Item>
                <TextInput placeholder="First Name" />
              </FormGroup.Item>
            </FormGroup>
          </FormGroup.Item>
          <FormGroup.Item label="Contact">
            <TextInput placeholder="Phone" />
          </FormGroup.Item>
          <FormGroup.Item label="Address">
            <FormGroup>
              <FormGroup.Item>
                <TextInput placeholder="Postal Code" />
              </FormGroup.Item>
              <FormGroup.Item>
                <TextInput placeholder="Address" />
              </FormGroup.Item>
            </FormGroup>
          </FormGroup.Item>
        </FormGroup>
      </section>

      {/* With Validation Message */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          검증 메시지와 함께
        </h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          FormGroup.Item 내에서 검증 메시지를 표시할 수 있습니다.
        </p>
        <FormGroup>
          <FormGroup.Item label="필수 입력">
            <TextInput placeholder="필수 항목입니다" />
            <p class="mt-1 text-sm text-danger-500">이 필드는 필수입니다.</p>
          </FormGroup.Item>
          <FormGroup.Item label="선택 입력">
            <TextInput placeholder="선택 항목입니다" />
            <p class="mt-1 text-sm text-base-500">선택적으로 입력할 수 있습니다.</p>
          </FormGroup.Item>
        </FormGroup>
      </section>

      {/* Controlled */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Controlled</h2>
        <div class="space-y-4">
          <FormGroup>
            <FormGroup.Item label="이름">
              <TextInput
                value={controlledName()}
                onValueChange={setControlledName}
                placeholder="이름을 입력하세요"
              />
            </FormGroup.Item>
            <FormGroup.Item label="이메일">
              <TextInput
                value={controlledEmail()}
                onValueChange={setControlledEmail}
                placeholder="이메일을 입력하세요"
              />
            </FormGroup.Item>
          </FormGroup>
          <p class="text-sm text-base-600 dark:text-base-400">
            이름:{" "}
            <code class="rounded bg-base-200 px-1 dark:bg-base-700">
              {controlledName() || "(없음)"}
            </code>
            {" / "}
            이메일:{" "}
            <code class="rounded bg-base-200 px-1 dark:bg-base-700">
              {controlledEmail() || "(없음)"}
            </code>
          </p>
          <div class="flex gap-2">
            <Button
              theme="primary"
              variant="solid"
              size="sm"
              onClick={() => {
                setControlledName("홍길동");
                setControlledEmail("hong@example.com");
              }}
            >
              값 채우기
            </Button>
            <Button
              variant="solid"
              size="sm"
              onClick={() => {
                setControlledName("");
                setControlledEmail("");
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
