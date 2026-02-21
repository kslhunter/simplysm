import { createSignal } from "solid-js";
import { Button, FormGroup, Icon, NumberInput, Select, TextInput } from "@simplysm/solid";
import { IconSearch } from "@tabler/icons-solidjs";

export default function FormGroupPage() {
  // Controlled 예제용 시그널
  const [controlledName, setControlledName] = createSignal("");
  const [controlledEmail, setControlledEmail] = createSignal("");

  return (
    <div class="space-y-8 p-6">
      {/* Basic FormGroup */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">기본 FormGroup</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          FormGroup은 폼 필드들을 수직으로 배치하는 컨테이너입니다. FormGroup.Item으로 각 필드를
          감쌉니다.
        </p>
        <FormGroup>
          <FormGroup.Item label="이름">
            <TextInput placeholder="이름을 입력하세요" />
          </FormGroup.Item>
          <FormGroup.Item label="이메일">
            <TextInput placeholder="이메일을 입력하세요" />
          </FormGroup.Item>
          <FormGroup.Item label="나이">
            <NumberInput placeholder="나이를 입력하세요" />
          </FormGroup.Item>
        </FormGroup>
      </section>

      {/* Inline FormGroup */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Inline FormGroup</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          inline prop을 사용하면 필드들이 수평으로 배치됩니다.
        </p>
        <FormGroup inline>
          <FormGroup.Item>
            <Button theme="primary" variant="solid" class="gap-1">
              <Icon icon={IconSearch} />
              조회
            </Button>
          </FormGroup.Item>
          <FormGroup.Item label="국가">
            <Select
              placeholder="선택하세요"
              renderValue={(v: string) => <>{v === "kr" ? "한국" : v === "us" ? "미국" : "일본"}</>}
            >
              <Select.Item value="kr">한국</Select.Item>
              <Select.Item value="us">미국</Select.Item>
              <Select.Item value="jp">일본</Select.Item>
            </Select>
          </FormGroup.Item>
          <FormGroup.Item label="검색어">
            <TextInput placeholder="검색어를 입력하세요" />
          </FormGroup.Item>
        </FormGroup>
      </section>

      {/* Without Labels */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">라벨 없이</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          FormGroup.Item의 label을 생략하면 라벨 없이 필드만 표시됩니다.
        </p>
        <FormGroup>
          <FormGroup.Item>
            <TextInput placeholder="제목" />
          </FormGroup.Item>
          <FormGroup.Item>
            <TextInput placeholder="내용" />
          </FormGroup.Item>
          <FormGroup.Item>
            <Button theme="primary" variant="solid">
              저장
            </Button>
          </FormGroup.Item>
        </FormGroup>
      </section>

      {/* Mixed Layout */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">혼합 레이아웃</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          FormGroup을 중첩하여 복잡한 폼 레이아웃을 구성할 수 있습니다.
        </p>
        <FormGroup>
          <FormGroup.Item label="기본 정보">
            <FormGroup inline>
              <FormGroup.Item>
                <TextInput placeholder="성" />
              </FormGroup.Item>
              <FormGroup.Item>
                <TextInput placeholder="이름" />
              </FormGroup.Item>
            </FormGroup>
          </FormGroup.Item>
          <FormGroup.Item label="연락처">
            <TextInput placeholder="전화번호" />
          </FormGroup.Item>
          <FormGroup.Item label="주소">
            <FormGroup>
              <FormGroup.Item>
                <TextInput placeholder="우편번호" />
              </FormGroup.Item>
              <FormGroup.Item>
                <TextInput placeholder="상세주소" />
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
