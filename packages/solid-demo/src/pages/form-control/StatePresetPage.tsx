import { createSignal } from "solid-js";
import { StatePreset, Topbar } from "@simplysm/solid";

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
                <h3 class="mb-3 text-lg font-semibold">필터 상태 저장/복원</h3>
                <StatePreset<FilterState>
                  presetKey="demo-filter"
                  value={filter()}
                  onValueChange={setFilter}
                />
                <div class="mt-4 space-y-2">
                  <div class="flex items-center gap-2">
                    <label class="text-sm font-medium">검색:</label>
                    <input
                      type="text"
                      class="rounded border border-base-300 px-2 py-1 dark:border-base-700 dark:bg-base-800"
                      value={filter().search}
                      onInput={(e) => setFilter((prev) => ({ ...prev, search: e.currentTarget.value }))}
                    />
                  </div>
                  <div class="flex items-center gap-2">
                    <label class="text-sm font-medium">카테고리:</label>
                    <select
                      class="rounded border border-base-300 px-2 py-1 dark:border-base-700 dark:bg-base-800"
                      value={filter().category}
                      onChange={(e) => setFilter((prev) => ({ ...prev, category: e.currentTarget.value }))}
                    >
                      <option value="all">전체</option>
                      <option value="food">음식</option>
                      <option value="drink">음료</option>
                    </select>
                  </div>
                  <div class="flex items-center gap-2">
                    <label class="text-sm font-medium">정렬:</label>
                    <select
                      class="rounded border border-base-300 px-2 py-1 dark:border-base-700 dark:bg-base-800"
                      value={filter().sortBy}
                      onChange={(e) => setFilter((prev) => ({ ...prev, sortBy: e.currentTarget.value }))}
                    >
                      <option value="name">이름</option>
                      <option value="price">가격</option>
                      <option value="date">날짜</option>
                    </select>
                  </div>
                </div>
                <p class="mt-2 text-sm text-base-600 dark:text-base-400">
                  현재 상태: <code class="rounded bg-base-200 px-1 dark:bg-base-700">{JSON.stringify(filter())}</code>
                </p>
              </div>
            </div>
          </section>

          {/* 크기 변형 */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">크기</h2>
            <div class="space-y-6">
              <div>
                <h3 class="mb-3 text-lg font-semibold">sm</h3>
                <StatePreset<FilterState>
                  presetKey="demo-filter-sm"
                  value={filter()}
                  onValueChange={setFilter}
                  size="sm"
                />
              </div>
              <div>
                <h3 class="mb-3 text-lg font-semibold">기본 (md)</h3>
                <StatePreset<FilterState>
                  presetKey="demo-filter-md"
                  value={filter()}
                  onValueChange={setFilter}
                />
              </div>
              <div>
                <h3 class="mb-3 text-lg font-semibold">lg</h3>
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
