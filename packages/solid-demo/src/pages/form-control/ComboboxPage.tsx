import { createSignal } from "solid-js";
import { Combobox, Button } from "@simplysm/solid";

interface Fruit {
  id: number;
  name: string;
  emoji: string;
}

const allFruits: Fruit[] = [
  { id: 1, name: "Apple", emoji: "🍎" },
  { id: 2, name: "Banana", emoji: "🍌" },
  { id: 3, name: "Grape", emoji: "🍇" },
  { id: 4, name: "Orange", emoji: "🍊" },
  { id: 5, name: "Watermelon", emoji: "🍉" },
  { id: 6, name: "Strawberry", emoji: "🍓" },
  { id: 7, name: "Peach", emoji: "🍑" },
  { id: 8, name: "Cherry", emoji: "🍒" },
];

// Instant filtering (no loading)
const filterFruits = (query: string): Promise<Fruit[]> => {
  if (!query.trim()) {
    return Promise.resolve(allFruits);
  }
  return Promise.resolve(
    allFruits.filter((fruit) => fruit.name.includes(query) || fruit.emoji.includes(query)),
  );
};

// Async search simulation (with loading)
const searchFruitsAsync = async (query: string): Promise<Fruit[]> => {
  // Network delay simulation
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (!query.trim()) {
    return allFruits;
  }
  return allFruits.filter((fruit) => fruit.name.includes(query) || fruit.emoji.includes(query));
};

export default function ComboboxPage() {
  // Signals for controlled example
  const [controlledSelected, setControlledSelected] = createSignal<Fruit | undefined>();
  const [customValue, setCustomValue] = createSignal<string | Fruit | undefined>();

  return (
    <div class="space-y-8 p-6">
      {/* Basic usage */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Basic Usage</h2>
        <p class="mb-3 text-sm text-base-600 dark:text-base-400">
          Filters instantly as you type. Search and select quickly without loading.
        </p>
        <Combobox
          loadItems={filterFruits}
          debounceMs={0}
          placeholder="Search for fruit"
          renderValue={(v: Fruit) => (
            <>
              {v.emoji} {v.name}
            </>
          )}
        >
          <Combobox.ItemTemplate>
            {(item: Fruit) => (
              <>
                {item.emoji} {item.name}
              </>
            )}
          </Combobox.ItemTemplate>
        </Combobox>
      </section>

      {/* allowCustomValue */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Allow Custom Values</h2>
        <p class="mb-3 text-sm text-base-600 dark:text-base-400">
          When allowCustomValue is true, you can enter values not in the list by pressing Enter.
        </p>
        <div class="flex flex-col items-start gap-3">
          <Combobox
            loadItems={filterFruits}
            placeholder="Search or enter directly"
            allowCustomValue
            value={customValue()}
            onValueChange={setCustomValue}
            renderValue={(v: string | Fruit) =>
              typeof v === "string" ? (
                <>{v}</>
              ) : (
                <>
                  {v.emoji} {v.name}
                </>
              )
            }
          >
            <Combobox.ItemTemplate>
              {(item: Fruit) => (
                <>
                  {item.emoji} {item.name}
                </>
              )}
            </Combobox.ItemTemplate>
          </Combobox>
          <p class="text-sm text-base-600 dark:text-base-400">
            Current value:{" "}
            <code class="rounded bg-base-200 px-1 dark:bg-base-700">
              {customValue() == null
                ? "(None)"
                : typeof customValue() === "string"
                  ? `"${customValue()}" (custom)`
                  : (customValue() as Fruit).name}
            </code>
          </p>
        </div>
      </section>

      {/* parseCustomValue */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Parse Custom Values</h2>
        <p class="mb-3 text-sm text-base-600 dark:text-base-400">
          Use parseCustomValue to convert manually entered strings to the desired format.
        </p>
        <Combobox<Fruit>
          loadItems={filterFruits}
          placeholder="Enter fruit name"
          allowCustomValue
          parseCustomValue={(text) => ({ id: 0, name: text, emoji: "🆕" })}
          renderValue={(v) => (
            <>
              {v.emoji} {v.name}
            </>
          )}
        >
          <Combobox.ItemTemplate>
            {(item: Fruit) => (
              <>
                {item.emoji} {item.name}
              </>
            )}
          </Combobox.ItemTemplate>
        </Combobox>
      </section>

      {/* Async loading */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Async Loading</h2>
        <p class="mb-3 text-sm text-base-600 dark:text-base-400">
          A loading spinner is displayed when calling server APIs. (500ms delay simulation)
        </p>
        <Combobox
          loadItems={searchFruitsAsync}
          placeholder="Search from server"
          renderValue={(v: Fruit) => (
            <>
              {v.emoji} {v.name}
            </>
          )}
        >
          <Combobox.ItemTemplate>
            {(item: Fruit) => (
              <>
                {item.emoji} {item.name}
              </>
            )}
          </Combobox.ItemTemplate>
        </Combobox>
      </section>

      {/* Size */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Size</h2>
        <div class="flex flex-col items-start gap-4">
          <Combobox
            size="sm"
            loadItems={filterFruits}
            placeholder="Small"
            renderValue={(v: Fruit) => <>{v.name}</>}
          >
            <Combobox.ItemTemplate>
              {(item: Fruit) => (
                <>
                  {item.emoji} {item.name}
                </>
              )}
            </Combobox.ItemTemplate>
          </Combobox>
          <Combobox
            loadItems={filterFruits}
            placeholder="Default"
            renderValue={(v: Fruit) => <>{v.name}</>}
          >
            <Combobox.ItemTemplate>
              {(item: Fruit) => (
                <>
                  {item.emoji} {item.name}
                </>
              )}
            </Combobox.ItemTemplate>
          </Combobox>
          <Combobox
            size="lg"
            loadItems={filterFruits}
            placeholder="Large"
            renderValue={(v: Fruit) => <>{v.name}</>}
          >
            <Combobox.ItemTemplate>
              {(item: Fruit) => (
                <>
                  {item.emoji} {item.name}
                </>
              )}
            </Combobox.ItemTemplate>
          </Combobox>
        </div>
      </section>

      {/* State */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">State</h2>
        <div class="flex flex-col items-start gap-4">
          <div>
            <p class="mb-1 text-sm text-base-600 dark:text-base-400">Disabled</p>
            <Combobox
              disabled
              loadItems={filterFruits}
              placeholder="disabled"
              renderValue={(v: Fruit) => <>{v.name}</>}
            >
              <Combobox.ItemTemplate>{(item: Fruit) => <>{item.name}</>}</Combobox.ItemTemplate>
            </Combobox>
          </div>
          <div>
            <p class="mb-1 text-sm text-base-600 dark:text-base-400">Inset (No Border)</p>
            <Combobox
              inset
              loadItems={filterFruits}
              placeholder="inset style"
              renderValue={(v: Fruit) => <>{v.name}</>}
            >
              <Combobox.ItemTemplate>
                {(item: Fruit) => (
                  <>
                    {item.emoji} {item.name}
                  </>
                )}
              </Combobox.ItemTemplate>
            </Combobox>
          </div>
        </div>
      </section>

      {/* Validation */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Validation</h2>
        <div class="space-y-4">
          <div>
            <h3 class="mb-3 text-lg font-semibold">Required</h3>
            <Combobox
              required
              loadItems={filterFruits}
              placeholder="Required selection"
              renderValue={(v: Fruit) => (
                <>
                  {v.emoji} {v.name}
                </>
              )}
            >
              <Combobox.ItemTemplate>
                {(item: Fruit) => (
                  <>
                    {item.emoji} {item.name}
                  </>
                )}
              </Combobox.ItemTemplate>
            </Combobox>
          </div>
          <div>
            <h3 class="mb-3 text-lg font-semibold">touchMode (displays after blur)</h3>
            <Combobox
              required
              touchMode
              loadItems={filterFruits}
              placeholder="Required selection with touch mode"
              renderValue={(v: Fruit) => (
                <>
                  {v.emoji} {v.name}
                </>
              )}
            >
              <Combobox.ItemTemplate>
                {(item: Fruit) => (
                  <>
                    {item.emoji} {item.name}
                  </>
                )}
              </Combobox.ItemTemplate>
            </Combobox>
          </div>
        </div>
      </section>

      {/* Controlled */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Controlled</h2>
        <div class="flex flex-col items-start gap-3">
          <Combobox
            value={controlledSelected()}
            onValueChange={setControlledSelected}
            loadItems={filterFruits}
            placeholder="Search for fruit"
            renderValue={(v) => (
              <>
                {v.emoji} {v.name}
              </>
            )}
          >
            <Combobox.ItemTemplate>
              {(item: Fruit) => (
                <>
                  {item.emoji} {item.name}
                </>
              )}
            </Combobox.ItemTemplate>
          </Combobox>
          <p class="text-sm text-base-600 dark:text-base-400">
            Current value:{" "}
            <code class="rounded bg-base-200 px-1 dark:bg-base-700">
              {controlledSelected()?.name ?? "(None)"}
            </code>
          </p>
          <div class="flex gap-2">
            <Button
              theme="primary"
              variant="solid"
              size="sm"
              onClick={() => setControlledSelected(allFruits[2])}
            >
              Select Grape
            </Button>
            <Button variant="solid" size="sm" onClick={() => setControlledSelected(undefined)}>
              Reset
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
