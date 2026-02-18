import { createSignal } from "solid-js";
import { Combobox, Topbar, Button } from "@simplysm/solid";

interface Fruit {
  id: number;
  name: string;
  emoji: string;
}

const allFruits: Fruit[] = [
  { id: 1, name: "사과", emoji: "🍎" },
  { id: 2, name: "바나나", emoji: "🍌" },
  { id: 3, name: "포도", emoji: "🍇" },
  { id: 4, name: "오렌지", emoji: "🍊" },
  { id: 5, name: "수박", emoji: "🍉" },
  { id: 6, name: "딸기", emoji: "🍓" },
  { id: 7, name: "복숭아", emoji: "🍑" },
  { id: 8, name: "체리", emoji: "🍒" },
];

// 즉시 필터링 (로딩 없음)
const filterFruits = (query: string): Promise<Fruit[]> => {
  if (!query.trim()) {
    return Promise.resolve(allFruits);
  }
  return Promise.resolve(
    allFruits.filter((fruit) => fruit.name.includes(query) || fruit.emoji.includes(query)),
  );
};

// 비동기 검색 시뮬레이션 (로딩 있음)
const searchFruitsAsync = async (query: string): Promise<Fruit[]> => {
  // 네트워크 지연 시뮬레이션
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (!query.trim()) {
    return allFruits;
  }
  return allFruits.filter((fruit) => fruit.name.includes(query) || fruit.emoji.includes(query));
};

export default function ComboboxPage() {
  // Controlled 예제용 시그널
  const [controlledSelected, setControlledSelected] = createSignal<Fruit | undefined>();
  const [customValue, setCustomValue] = createSignal<string | Fruit | undefined>();

  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Combobox</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* 기본 사용 */}
          <section>
            <h2 class="mb-4 text-xl font-bold">기본 사용</h2>
            <p class="mb-3 text-sm text-base-600 dark:text-base-400">
              입력하면 즉시 필터링됩니다. 로딩 없이 빠르게 검색/선택할 수 있습니다.
            </p>
            <Combobox
              loadItems={filterFruits}
              debounceMs={0}
              placeholder="과일을 검색하세요"
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
            <h2 class="mb-4 text-xl font-bold">커스텀 값 허용</h2>
            <p class="mb-3 text-sm text-base-600 dark:text-base-400">
              allowCustomValue가 true이면 목록에 없는 값도 Enter로 입력할 수 있습니다.
            </p>
            <div class="flex flex-col items-start gap-3">
              <Combobox
                loadItems={filterFruits}
                placeholder="검색하거나 직접 입력"
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
                현재 값:{" "}
                <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                  {customValue() == null
                    ? "(없음)"
                    : typeof customValue() === "string"
                      ? `"${customValue()}" (직접 입력)`
                      : (customValue() as Fruit).name}
                </code>
              </p>
            </div>
          </section>

          {/* parseCustomValue */}
          <section>
            <h2 class="mb-4 text-xl font-bold">커스텀 값 변환</h2>
            <p class="mb-3 text-sm text-base-600 dark:text-base-400">
              parseCustomValue로 직접 입력한 문자열을 원하는 형태로 변환할 수 있습니다.
            </p>
            <Combobox<Fruit>
              loadItems={filterFruits}
              placeholder="과일 이름 입력"
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

          {/* 비동기 로딩 */}
          <section>
            <h2 class="mb-4 text-xl font-bold">비동기 로딩</h2>
            <p class="mb-3 text-sm text-base-600 dark:text-base-400">
              서버 API 호출 시 로딩 스피너가 표시됩니다. (500ms 딜레이 시뮬레이션)
            </p>
            <Combobox
              loadItems={searchFruitsAsync}
              placeholder="서버에서 검색"
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

          {/* 사이즈 */}
          <section>
            <h2 class="mb-4 text-xl font-bold">사이즈</h2>
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

          {/* 상태 */}
          <section>
            <h2 class="mb-4 text-xl font-bold">상태</h2>
            <div class="flex flex-col items-start gap-4">
              <div>
                <p class="mb-1 text-sm text-base-600 dark:text-base-400">Disabled</p>
                <Combobox
                  disabled
                  loadItems={filterFruits}
                  placeholder="비활성화됨"
                  renderValue={(v: Fruit) => <>{v.name}</>}
                >
                  <Combobox.ItemTemplate>{(item: Fruit) => <>{item.name}</>}</Combobox.ItemTemplate>
                </Combobox>
              </div>
              <div>
                <p class="mb-1 text-sm text-base-600 dark:text-base-400">Inset (테두리 없음)</p>
                <Combobox
                  inset
                  loadItems={filterFruits}
                  placeholder="인셋 스타일"
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
            <h2 class="mb-4 text-xl font-semibold">Validation</h2>
            <div class="space-y-4">
              <div>
                <h3 class="mb-3 text-lg font-semibold">Required</h3>
                <Combobox
                  required
                  loadItems={filterFruits}
                  placeholder="필수 선택"
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
                <h3 class="mb-3 text-lg font-semibold">touchMode (blur 후 표시)</h3>
                <Combobox
                  required
                  touchMode
                  loadItems={filterFruits}
                  placeholder="touchMode 필수 선택"
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
            <h2 class="mb-4 text-xl font-bold">Controlled</h2>
            <div class="flex flex-col items-start gap-3">
              <Combobox
                value={controlledSelected()}
                onValueChange={setControlledSelected}
                loadItems={filterFruits}
                placeholder="과일을 검색하세요"
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
                현재 값:{" "}
                <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                  {controlledSelected()?.name ?? "(없음)"}
                </code>
              </p>
              <div class="flex gap-2">
                <Button
                  theme="primary"
                  variant="solid"
                  size="sm"
                  onClick={() => setControlledSelected(allFruits[2])}
                >
                  포도 선택
                </Button>
                <Button variant="solid" size="sm" onClick={() => setControlledSelected(undefined)}>
                  초기화
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
