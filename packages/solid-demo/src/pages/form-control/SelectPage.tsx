import { createSignal, For } from "solid-js";
import { Select, SelectItem, Topbar, TopbarContainer } from "@simplysm/solid";
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
  // Controlled 예제용 시그널
  const [controlledSelected, setControlledSelected] = createSignal<Fruit | undefined>();
  const [controlledMultiSelected, setControlledMultiSelected] = createSignal<Fruit[]>([]);

  return (
    <TopbarContainer>
      <Topbar>
        <h1 class="m-0 text-base">Select</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* 기본 사용 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">기본 사용</h2>
            <Select
              placeholder="과일을 선택하세요"
              renderValue={(v: Fruit) => <>{v.emoji} {v.name}</>}
            >
              <For each={fruits}>
                {(fruit) => (
                  <SelectItem value={fruit}>
                    {fruit.emoji} {fruit.name}
                  </SelectItem>
                )}
              </For>
            </Select>
          </section>

          {/* 다중 선택 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">다중 선택</h2>
            <Select
              multiple
              placeholder="여러 개 선택 가능"
              renderValue={(v: Fruit) => <>{v.emoji} {v.name}</>}
            >
              <For each={fruits}>
                {(fruit) => (
                  <SelectItem value={fruit}>
                    {fruit.emoji} {fruit.name}
                  </SelectItem>
                )}
              </For>
            </Select>
          </section>

          {/* 추가 버튼 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">추가 버튼 (Select.Button)</h2>
            <Select
              placeholder="선택하세요"
              renderValue={(v: string) => <>{v}</>}
            >
              <SelectItem value="옵션 1">옵션 1</SelectItem>
              <SelectItem value="옵션 2">옵션 2</SelectItem>
              <Select.Button onClick={() => alert("추가 버튼 클릭!")}>
                <IconPlus size={16} />
              </Select.Button>
            </Select>
          </section>

          {/* 커스텀 헤더 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">커스텀 헤더 (Select.Header)</h2>
            <Select
              placeholder="선택하세요"
              renderValue={(v: string) => <>{v}</>}
            >
              <Select.Header>
                <div class="border-b border-base-200 p-2 text-sm font-semibold text-base-500 dark:border-base-700">
                  검색 결과
                </div>
              </Select.Header>
              <SelectItem value="결과 1">결과 1</SelectItem>
              <SelectItem value="결과 2">결과 2</SelectItem>
              <SelectItem value="결과 3">결과 3</SelectItem>
            </Select>
          </section>

          {/* 계층 구조 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">계층 구조 (중첩 아이템)</h2>
            <Select
              placeholder="카테고리 선택"
              renderValue={(v: Category) => <>{v.name}</>}
            >
              <For each={categories}>
                {(category) => (
                  <SelectItem value={category}>
                    {category.name}
                    {category.children && (
                      <SelectItem.Children>
                        <For each={category.children}>
                          {(child) => (
                            <SelectItem value={child}>{child.name}</SelectItem>
                          )}
                        </For>
                      </SelectItem.Children>
                    )}
                  </SelectItem>
                )}
              </For>
            </Select>
          </section>

          {/* 사이즈 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">사이즈</h2>
            <div class="flex flex-col items-start gap-4">
              <Select size="sm" placeholder="Small" renderValue={(v: string) => <>{v}</>}>
                <SelectItem value="A">옵션 A</SelectItem>
                <SelectItem value="B">옵션 B</SelectItem>
              </Select>
              <Select placeholder="Default" renderValue={(v: string) => <>{v}</>}>
                <SelectItem value="A">옵션 A</SelectItem>
                <SelectItem value="B">옵션 B</SelectItem>
              </Select>
              <Select size="lg" placeholder="Large" renderValue={(v: string) => <>{v}</>}>
                <SelectItem value="A">옵션 A</SelectItem>
                <SelectItem value="B">옵션 B</SelectItem>
              </Select>
            </div>
          </section>

          {/* 상태 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">상태</h2>
            <div class="flex flex-col items-start gap-4">
              <div>
                <p class="mb-1 text-sm text-base-600 dark:text-base-400">Disabled</p>
                <Select disabled placeholder="비활성화됨" renderValue={(v: string) => <>{v}</>}>
                  <SelectItem value="A">옵션 A</SelectItem>
                </Select>
              </div>
              <div>
                <p class="mb-1 text-sm text-base-600 dark:text-base-400">Inset (테두리 없음)</p>
                <Select inset placeholder="인셋 스타일" renderValue={(v: string) => <>{v}</>}>
                  <SelectItem value="A">옵션 A</SelectItem>
                  <SelectItem value="B">옵션 B</SelectItem>
                </Select>
              </div>
            </div>
          </section>

          {/* Controlled */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">Controlled</h2>
            <div class="space-y-6">
              {/* 단일 선택 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">단일 선택</h3>
                <div class="flex flex-col items-start gap-3">
                  <Select
                    value={controlledSelected()}
                    onValueChange={setControlledSelected}
                    placeholder="과일을 선택하세요"
                    renderValue={(v) => <>{v.emoji} {v.name}</>}
                  >
                    <For each={fruits}>
                      {(fruit) => (
                        <SelectItem value={fruit}>
                          {fruit.emoji} {fruit.name}
                        </SelectItem>
                      )}
                    </For>
                  </Select>
                  <p class="text-sm text-base-600 dark:text-base-400">
                    현재 값: <code class="rounded bg-base-200 px-1 dark:bg-base-700">{controlledSelected()?.name ?? "(없음)"}</code>
                  </p>
                  <button
                    class="w-fit rounded bg-primary-500 px-3 py-1 text-sm text-white hover:bg-primary-600"
                    onClick={() => setControlledSelected(fruits[2])}
                  >
                    포도 선택
                  </button>
                </div>
              </div>

              {/* 다중 선택 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">다중 선택</h3>
                <div class="flex flex-col items-start gap-3">
                  <Select
                    multiple
                    value={controlledMultiSelected()}
                    onValueChange={(v) => setControlledMultiSelected(v as Fruit[])}
                    placeholder="여러 개 선택 가능"
                    renderValue={(v) => <>{v.emoji} {v.name}</>}
                  >
                    <For each={fruits}>
                      {(fruit) => (
                        <SelectItem value={fruit}>
                          {fruit.emoji} {fruit.name}
                        </SelectItem>
                      )}
                    </For>
                  </Select>
                  <p class="text-sm text-base-600 dark:text-base-400">
                    현재 값: <code class="rounded bg-base-200 px-1 dark:bg-base-700">{controlledMultiSelected().map((f) => f.name).join(", ") || "(없음)"}</code>
                  </p>
                  <div class="flex gap-2">
                    <button
                      class="w-fit rounded bg-primary-500 px-3 py-1 text-sm text-white hover:bg-primary-600"
                      onClick={() => setControlledMultiSelected([fruits[0], fruits[1]])}
                    >
                      사과+바나나
                    </button>
                    <button
                      class="w-fit rounded bg-base-500 px-3 py-1 text-sm text-white hover:bg-base-600"
                      onClick={() => setControlledMultiSelected([])}
                    >
                      초기화
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </TopbarContainer>
  );
}
