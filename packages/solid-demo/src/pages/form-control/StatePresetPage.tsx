import { createSignal } from "solid-js";
import { StatePreset, TextInput, Select } from "@simplysm/solid";

interface FilterState {
  search: string;
  category: string;
  sortBy: string;
}

export default function StatePresetPage() {
  const [filter, setFilter] = createSignal<FilterState>({
    search: "",
    category: "all",
    sortBy: "name",
  });

  return (
    <div class="space-y-12 p-6">
      {/* Basic usage */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Basic Usage</h2>
        <div class="space-y-6">
          <div>
            <h3 class="mb-3 text-lg font-bold">Save/Restore Filter State</h3>
            <StatePreset<FilterState>
              presetKey="demo-filter"
              value={filter()}
              onValueChange={setFilter}
            />
            <div class="mt-4 space-y-2">
              <div class="flex items-center gap-2">
                <label class="text-sm font-medium">Search:</label>
                <TextInput
                  value={filter().search}
                  onValueChange={(v) => setFilter((prev) => ({ ...prev, search: v }))}
                />
              </div>
              <div class="flex items-center gap-2">
                <label class="text-sm font-medium">Category:</label>
                <Select<string>
                  value={filter().category}
                  onValueChange={(v) => setFilter((prev) => ({ ...prev, category: v }))}
                  renderValue={(v) => <>{{ all: "All", food: "Food", drink: "Drink" }[v]}</>}
                >
                  <Select.Item value="all">All</Select.Item>
                  <Select.Item value="food">Food</Select.Item>
                  <Select.Item value="drink">Drink</Select.Item>
                </Select>
              </div>
              <div class="flex items-center gap-2">
                <label class="text-sm font-medium">Sort:</label>
                <Select<string>
                  value={filter().sortBy}
                  onValueChange={(v) => setFilter((prev) => ({ ...prev, sortBy: v }))}
                  renderValue={(v) => <>{{ name: "Name", price: "Price", date: "Date" }[v]}</>}
                >
                  <Select.Item value="name">Name</Select.Item>
                  <Select.Item value="price">Price</Select.Item>
                  <Select.Item value="date">Date</Select.Item>
                </Select>
              </div>
            </div>
            <p class="mt-2 text-sm text-base-600 dark:text-base-400">
              Current state:{" "}
              <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                {JSON.stringify(filter())}
              </code>
            </p>
          </div>
        </div>
      </section>

      {/* Size variants */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Size</h2>
        <div class="space-y-6">
          <div>
            <h3 class="mb-3 text-lg font-bold">sm</h3>
            <StatePreset<FilterState>
              presetKey="demo-filter-sm"
              value={filter()}
              onValueChange={setFilter}
              size="sm"
            />
          </div>
          <div>
            <h3 class="mb-3 text-lg font-bold">Default (md)</h3>
            <StatePreset<FilterState>
              presetKey="demo-filter-md"
              value={filter()}
              onValueChange={setFilter}
            />
          </div>
          <div>
            <h3 class="mb-3 text-lg font-bold">lg</h3>
            <StatePreset<FilterState>
              presetKey="demo-filter-lg"
              value={filter()}
              onValueChange={setFilter}
              size="lg"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
