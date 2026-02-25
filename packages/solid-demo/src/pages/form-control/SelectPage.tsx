import { createSignal, For } from "solid-js";
import { Select, Button } from "@simplysm/solid";
import { IconPlus } from "@tabler/icons-solidjs";

interface Fruit {
  id: number;
  name: string;
  emoji: string;
}

const fruits: Fruit[] = [
  { id: 1, name: "Apple", emoji: "🍎" },
  { id: 2, name: "Banana", emoji: "🍌" },
  { id: 3, name: "Grape", emoji: "🍇" },
  { id: 4, name: "Orange", emoji: "🍊" },
  { id: 5, name: "Watermelon", emoji: "🍉" },
];

interface Category {
  id: number;
  name: string;
  children?: Category[];
}

const categories: Category[] = [
  {
    id: 1,
    name: "Fruits",
    children: [
      { id: 11, name: "Apple" },
      { id: 12, name: "Banana" },
    ],
  },
  {
    id: 2,
    name: "Vegetables",
    children: [
      { id: 21, name: "Carrot" },
      { id: 22, name: "Broccoli" },
    ],
  },
  { id: 3, name: "Others" },
];

export default function SelectPage() {
  // Signals for controlled example
  const [controlledSelected, setControlledSelected] = createSignal<Fruit | undefined>();
  const [controlledMultiSelected, setControlledMultiSelected] = createSignal<Fruit[]>([]);

  return (
    <div class="space-y-8 p-6">
      {/* Basic usage */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Basic Usage</h2>
        <Select
          placeholder="Select a fruit"
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
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Multiple Selection</h2>
        <Select
          multiple
          placeholder="Multiple selections available"
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
          Add Button (Select.Action)
        </h2>
        <Select placeholder="Select an option" renderValue={(v: string) => <>{v}</>}>
          <Select.Item value="Option 1">Option 1</Select.Item>
          <Select.Item value="Option 2">Option 2</Select.Item>
          <Select.Action onClick={() => alert("Add button clicked!")}>
            <IconPlus size={16} />
          </Select.Action>
        </Select>
      </section>

      {/* Custom header */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          Custom Header (Select.Header)
        </h2>
        <Select placeholder="Select an option" renderValue={(v: string) => <>{v}</>}>
          <Select.Header>
            <div class="border-b border-base-200 p-2 text-sm font-bold text-base-500 dark:border-base-700">
              Search Results
            </div>
          </Select.Header>
          <Select.Item value="Result 1">Result 1</Select.Item>
          <Select.Item value="Result 2">Result 2</Select.Item>
          <Select.Item value="Result 3">Result 3</Select.Item>
        </Select>
      </section>

      {/* Hierarchical structure */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          Hierarchical Structure (Nested Items)
        </h2>
        <Select placeholder="Select a category" renderValue={(v: Category) => <>{v.name}</>}>
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
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Size</h2>
        <div class="flex flex-col items-start gap-4">
          <Select size="sm" placeholder="Small" renderValue={(v: string) => <>{v}</>}>
            <Select.Item value="A">Option A</Select.Item>
            <Select.Item value="B">Option B</Select.Item>
          </Select>
          <Select placeholder="Default" renderValue={(v: string) => <>{v}</>}>
            <Select.Item value="A">Option A</Select.Item>
            <Select.Item value="B">Option B</Select.Item>
          </Select>
          <Select size="lg" placeholder="Large" renderValue={(v: string) => <>{v}</>}>
            <Select.Item value="A">Option A</Select.Item>
            <Select.Item value="B">Option B</Select.Item>
          </Select>
        </div>
      </section>

      {/* State */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">State</h2>
        <div class="flex flex-col items-start gap-4">
          <div>
            <p class="mb-1 text-sm text-base-600 dark:text-base-400">Disabled</p>
            <Select disabled placeholder="Disabled" renderValue={(v: string) => <>{v}</>}>
              <Select.Item value="A">Option A</Select.Item>
            </Select>
          </div>
          <div>
            <p class="mb-1 text-sm text-base-600 dark:text-base-400">Inset (No Border)</p>
            <Select inset placeholder="Inset Style" renderValue={(v: string) => <>{v}</>}>
              <Select.Item value="A">Option A</Select.Item>
              <Select.Item value="B">Option B</Select.Item>
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
            <h3 class="mb-3 text-lg font-bold">Single Selection</h3>
            <div class="flex flex-col items-start gap-3">
              <Select
                value={controlledSelected()}
                onValueChange={setControlledSelected}
                placeholder="Select a fruit"
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
                Current value:{" "}
                <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                  {controlledSelected()?.name ?? "(None)"}
                </code>
              </p>
              <Button
                theme="primary"
                variant="solid"
                size="sm"
                onClick={() => setControlledSelected(fruits[2])}
              >
                Select Grape
              </Button>
            </div>
          </div>

          {/* Multiple selection */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Multiple Selection</h3>
            <div class="flex flex-col items-start gap-3">
              <Select<Fruit>
                multiple
                value={controlledMultiSelected()}
                onValueChange={(v) => setControlledMultiSelected(v)}
                placeholder="Multiple selections available"
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
                Current value:{" "}
                <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                  {controlledMultiSelected()
                    .map((f) => f.name)
                    .join(", ") || "(None)"}
                </code>
              </p>
              <div class="flex gap-2">
                <Button
                  theme="primary"
                  variant="solid"
                  size="sm"
                  onClick={() => setControlledMultiSelected([fruits[0], fruits[1]])}
                >
                  Select Apple+Banana
                </Button>
                <Button variant="solid" size="sm" onClick={() => setControlledMultiSelected([])}>
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
