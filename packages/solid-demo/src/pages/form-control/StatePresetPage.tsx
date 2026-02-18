import { createSignal } from "solid-js";
import { StatePreset, Topbar, TextInput, Select } from "@simplysm/solid";

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
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">StatePreset</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-12">
          {/* 기본 사용 */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">기본 사용</h2>
            <div class="space-y-6">
              <div>
                <h3 class="mb-3 text-lg font-bold">필터 상태 저장/복원</h3>
                <StatePreset<FilterState>
                  presetKey="demo-filter"
                  value={filter()}
                  onValueChange={setFilter}
                />
                <div class="mt-4 space-y-2">
                  <div class="flex items-center gap-2">
                    <label class="text-sm font-medium">검색:</label>
                    <TextInput
                      value={filter().search}
                      onValueChange={(v) => setFilter((prev) => ({ ...prev, search: v }))}
                    />
                  </div>
                  <div class="flex items-center gap-2">
                    <label class="text-sm font-medium">카테고리:</label>
                    <Select<string>
                      value={filter().category}
                      onValueChange={(v) => setFilter((prev) => ({ ...prev, category: v }))}
                      renderValue={(v) => <>{{ all: "전체", food: "음식", drink: "음료" }[v]}</>}
                    >
                      <Select.Item value="all">전체</Select.Item>
                      <Select.Item value="food">음식</Select.Item>
                      <Select.Item value="drink">음료</Select.Item>
                    </Select>
                  </div>
                  <div class="flex items-center gap-2">
                    <label class="text-sm font-medium">정렬:</label>
                    <Select<string>
                      value={filter().sortBy}
                      onValueChange={(v) => setFilter((prev) => ({ ...prev, sortBy: v }))}
                      renderValue={(v) => <>{{ name: "이름", price: "가격", date: "날짜" }[v]}</>}
                    >
                      <Select.Item value="name">이름</Select.Item>
                      <Select.Item value="price">가격</Select.Item>
                      <Select.Item value="date">날짜</Select.Item>
                    </Select>
                  </div>
                </div>
                <p class="mt-2 text-sm text-base-600 dark:text-base-400">
                  현재 상태:{" "}
                  <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                    {JSON.stringify(filter())}
                  </code>
                </p>
              </div>
            </div>
          </section>

          {/* 크기 변형 */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">크기</h2>
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
                <h3 class="mb-3 text-lg font-bold">기본 (md)</h3>
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
      </div>
    </Topbar.Container>
  );
}
