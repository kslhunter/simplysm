import { createSignal, For } from "solid-js";
import { Select, Button } from "@simplysm/solid";
import { IconPlus } from "@tabler/icons-solidjs";

interface Fruit {
  id: number;
  name: string;
  emoji: string;
}

const fruits: Fruit[] = [
  { id: 1, name: "사과", emoji: "🍎" },
  { id: 2, name: "바나나", emoji: "🍌" },
  { id: 3, name: "포도", emoji: "🍇" },
  { id: 4, name: "오렌지", emoji: "🍊" },
  { id: 5, name: "수박", emoji: "🍉" },
];

interface Category {
  id: number;
  name: string;
  children?: Category[];
}

const categories: Category[] = [
  {
    id: 1,
    name: "과일",
    children: [
      { id: 11, name: "사과" },
      { id: 12, name: "바나나" },
    ],
  },
  {
    id: 2,
    name: "채소",
    children: [
      { id: 21, name: "당근" },
      { id: 22, name: "브로콜리" },
    ],
  },
  { id: 3, name: "기타" },
];

export default function SelectPage() {
  // Signals for controlled example
  const [controlledSelected, setControlledSelected] = createSignal<Fruit | undefined>();
  const [controlledMultiSelected, setControlledMultiSelected] = createSignal<Fruit[]>([]);

  return (
    <div class="space-y-8 p-6">
      {/* Basic usage */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">기본 사용</h2>
        <Select
          placeholder="과일을 선택하세요"
          renderValue={(v: Fruit) => (
            <>
              {v.emoji} {v.name}
            </>
          )}
        >
          <For each={fruits}>
            {(fruit) => (
              <Select.Item value={fruit}>
                {fruit.emoji} {fruit.name}
              </Select.Item>
            )}
          </For>
        </Select>
      </section>

      {/* Multiple selection */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">다중 선택</h2>
        <Select
          multiple
          placeholder="여러 개 선택 가능"
          renderValue={(v: Fruit) => (
            <>
              {v.emoji} {v.name}
            </>
          )}
        >
          <For each={fruits}>
            {(fruit) => (
              <Select.Item value={fruit}>
                {fruit.emoji} {fruit.name}
              </Select.Item>
            )}
          </For>
        </Select>
      </section>

      {/* Add button */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          추가 버튼 (Select.Action)
        </h2>
        <Select placeholder="선택하세요" renderValue={(v: string) => <>{v}</>}>
          <Select.Item value="옵션 1">옵션 1</Select.Item>
          <Select.Item value="옵션 2">옵션 2</Select.Item>
          <Select.Action onClick={() => alert("추가 버튼 클릭!")}>
            <IconPlus size={16} />
          </Select.Action>
        </Select>
      </section>

      {/* Custom header */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          커스텀 헤더 (Select.Header)
        </h2>
        <Select placeholder="선택하세요" renderValue={(v: string) => <>{v}</>}>
          <Select.Header>
            <div class="border-b border-base-200 p-2 text-sm font-bold text-base-500 dark:border-base-700">
              검색 결과
            </div>
          </Select.Header>
          <Select.Item value="결과 1">결과 1</Select.Item>
          <Select.Item value="결과 2">결과 2</Select.Item>
          <Select.Item value="결과 3">결과 3</Select.Item>
        </Select>
      </section>

      {/* Hierarchical structure */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          계층 구조 (중첩 아이템)
        </h2>
        <Select placeholder="카테고리 선택" renderValue={(v: Category) => <>{v.name}</>}>
          <For each={categories}>
            {(category) => (
              <Select.Item value={category}>
                {category.name}
                {category.children && (
                  <Select.Item.Children>
                    <For each={category.children}>
                      {(child) => <Select.Item value={child}>{child.name}</Select.Item>}
                    </For>
                  </Select.Item.Children>
                )}
              </Select.Item>
            )}
          </For>
        </Select>
      </section>

      {/* Size */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">사이즈</h2>
        <div class="flex flex-col items-start gap-4">
          <Select size="sm" placeholder="Small" renderValue={(v: string) => <>{v}</>}>
            <Select.Item value="A">옵션 A</Select.Item>
            <Select.Item value="B">옵션 B</Select.Item>
          </Select>
          <Select placeholder="Default" renderValue={(v: string) => <>{v}</>}>
            <Select.Item value="A">옵션 A</Select.Item>
            <Select.Item value="B">옵션 B</Select.Item>
          </Select>
          <Select size="lg" placeholder="Large" renderValue={(v: string) => <>{v}</>}>
            <Select.Item value="A">옵션 A</Select.Item>
            <Select.Item value="B">옵션 B</Select.Item>
          </Select>
        </div>
      </section>

      {/* State */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">상태</h2>
        <div class="flex flex-col items-start gap-4">
          <div>
            <p class="mb-1 text-sm text-base-600 dark:text-base-400">Disabled</p>
            <Select disabled placeholder="비활성화됨" renderValue={(v: string) => <>{v}</>}>
              <Select.Item value="A">옵션 A</Select.Item>
            </Select>
          </div>
          <div>
            <p class="mb-1 text-sm text-base-600 dark:text-base-400">Inset (테두리 없음)</p>
            <Select inset placeholder="인셋 스타일" renderValue={(v: string) => <>{v}</>}>
              <Select.Item value="A">옵션 A</Select.Item>
              <Select.Item value="B">옵션 B</Select.Item>
            </Select>
          </div>
        </div>
      </section>

      {/* Validation */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Validation</h2>
        <div class="space-y-4">
          <div>
            <h3 class="mb-3 text-lg font-semibold">Required</h3>
            <Select required placeholder="필수 선택" renderValue={(v: string) => <>{v}</>}>
              <Select.Item value="A">옵션 A</Select.Item>
              <Select.Item value="B">옵션 B</Select.Item>
            </Select>
          </div>
          <div>
            <h3 class="mb-3 text-lg font-semibold">touchMode (blur 후 표시)</h3>
            <Select
              required
              touchMode
              placeholder="touchMode 필수 선택"
              renderValue={(v: string) => <>{v}</>}
            >
              <Select.Item value="A">옵션 A</Select.Item>
              <Select.Item value="B">옵션 B</Select.Item>
            </Select>
          </div>
        </div>
      </section>

      {/* Controlled */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Controlled</h2>
        <div class="space-y-6">
          {/* Single selection */}
          <div>
            <h3 class="mb-3 text-lg font-bold">단일 선택</h3>
            <div class="flex flex-col items-start gap-3">
              <Select
                value={controlledSelected()}
                onValueChange={setControlledSelected}
                placeholder="과일을 선택하세요"
                renderValue={(v) => (
                  <>
                    {v.emoji} {v.name}
                  </>
                )}
              >
                <For each={fruits}>
                  {(fruit) => (
                    <Select.Item value={fruit}>
                      {fruit.emoji} {fruit.name}
                    </Select.Item>
                  )}
                </For>
              </Select>
              <p class="text-sm text-base-600 dark:text-base-400">
                현재 값:{" "}
                <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                  {controlledSelected()?.name ?? "(없음)"}
                </code>
              </p>
              <Button
                theme="primary"
                variant="solid"
                size="sm"
                onClick={() => setControlledSelected(fruits[2])}
              >
                포도 선택
              </Button>
            </div>
          </div>

          {/* Multiple selection */}
          <div>
            <h3 class="mb-3 text-lg font-bold">다중 선택</h3>
            <div class="flex flex-col items-start gap-3">
              <Select<Fruit>
                multiple
                value={controlledMultiSelected()}
                onValueChange={(v) => setControlledMultiSelected(v)}
                placeholder="여러 개 선택 가능"
                renderValue={(v) => (
                  <>
                    {v.emoji} {v.name}
                  </>
                )}
              >
                <For each={fruits}>
                  {(fruit) => (
                    <Select.Item value={fruit}>
                      {fruit.emoji} {fruit.name}
                    </Select.Item>
                  )}
                </For>
              </Select>
              <p class="text-sm text-base-600 dark:text-base-400">
                현재 값:{" "}
                <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                  {controlledMultiSelected()
                    .map((f) => f.name)
                    .join(", ") || "(없음)"}
                </code>
              </p>
              <div class="flex gap-2">
                <Button
                  theme="primary"
                  variant="solid"
                  size="sm"
                  onClick={() => setControlledMultiSelected([fruits[0], fruits[1]])}
                >
                  사과+바나나
                </Button>
                <Button variant="solid" size="sm" onClick={() => setControlledMultiSelected([])}>
                  초기화
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
