import { createSignal, For } from "solid-js";
import { Select, Topbar, TopbarContainer } from "@simplysm/solid";
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
  // 기본 단일 선택
  const [selected, setSelected] = createSignal<Fruit | undefined>();

  // 다중 선택
  const [multiSelected, setMultiSelected] = createSignal<Fruit[]>([]);

  // 계층 구조
  const [categorySelected, setCategorySelected] = createSignal<Category | undefined>();

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
            <p class="mb-2 text-sm text-gray-600 dark:text-gray-400">
              선택: {selected()?.name ?? "없음"}
            </p>
            <div class="max-w-xs">
              <Select
                value={selected()}
                onValueChange={setSelected}
                placeholder="과일을 선택하세요"
                renderValue={(v) => <>{v.emoji} {v.name}</>}
              >
                <For each={fruits}>
                  {(fruit) => (
                    <Select.Item value={fruit}>
                      {fruit.emoji} {fruit.name}
                    </Select.Item>
                  )}
                </For>
              </Select>
            </div>
          </section>

          {/* 다중 선택 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">다중 선택</h2>
            <p class="mb-2 text-sm text-gray-600 dark:text-gray-400">
              선택: {multiSelected().map((f) => f.name).join(", ") || "없음"}
            </p>
            <div class="max-w-xs">
              <Select
                multiple
                value={multiSelected()}
                onValueChange={(v) => setMultiSelected(v as Fruit[])}
                placeholder="여러 개 선택 가능"
                renderValue={(v) => <>{v.emoji} {v.name}</>}
              >
                <For each={fruits}>
                  {(fruit) => (
                    <Select.Item value={fruit}>
                      {fruit.emoji} {fruit.name}
                    </Select.Item>
                  )}
                </For>
              </Select>
            </div>
          </section>

          {/* 추가 버튼 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">추가 버튼 (Select.Button)</h2>
            <div class="max-w-xs">
              <Select
                placeholder="선택하세요"
                renderValue={(v: string) => <>{v}</>}
              >
                <Select.Item value="옵션 1">옵션 1</Select.Item>
                <Select.Item value="옵션 2">옵션 2</Select.Item>
                <Select.Button onClick={() => alert("추가 버튼 클릭!")}>
                  <IconPlus size={16} />
                </Select.Button>
              </Select>
            </div>
          </section>

          {/* 커스텀 헤더 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">커스텀 헤더 (Select.Header)</h2>
            <div class="max-w-xs">
              <Select
                placeholder="선택하세요"
                renderValue={(v: string) => <>{v}</>}
              >
                <Select.Header>
                  <div class="border-b border-neutral-200 p-2 text-sm font-semibold text-neutral-500 dark:border-neutral-700">
                    검색 결과
                  </div>
                </Select.Header>
                <Select.Item value="결과 1">결과 1</Select.Item>
                <Select.Item value="결과 2">결과 2</Select.Item>
                <Select.Item value="결과 3">결과 3</Select.Item>
              </Select>
            </div>
          </section>

          {/* 계층 구조 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">계층 구조 (중첩 아이템)</h2>
            <p class="mb-2 text-sm text-gray-600 dark:text-gray-400">
              선택: {categorySelected()?.name ?? "없음"}
            </p>
            <div class="max-w-xs">
              <Select
                value={categorySelected()}
                onValueChange={setCategorySelected}
                placeholder="카테고리 선택"
                renderValue={(v) => <>{v.name}</>}
              >
                <For each={categories}>
                  {(category) => (
                    <Select.Item value={category}>
                      {category.name}
                      {category.children && (
                        <Select.Item.Children>
                          <For each={category.children}>
                            {(child) => (
                              <Select.Item value={child}>{child.name}</Select.Item>
                            )}
                          </For>
                        </Select.Item.Children>
                      )}
                    </Select.Item>
                  )}
                </For>
              </Select>
            </div>
          </section>

          {/* 사이즈 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">사이즈</h2>
            <div class="flex flex-col gap-4">
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

          {/* 상태 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">상태</h2>
            <div class="flex max-w-xs flex-col gap-4">
              <div>
                <p class="mb-1 text-sm text-gray-600 dark:text-gray-400">Disabled</p>
                <Select disabled placeholder="비활성화됨" renderValue={(v: string) => <>{v}</>}>
                  <Select.Item value="A">옵션 A</Select.Item>
                </Select>
              </div>
              <div>
                <p class="mb-1 text-sm text-gray-600 dark:text-gray-400">Inset (테두리 없음)</p>
                <Select inset placeholder="인셋 스타일" renderValue={(v: string) => <>{v}</>}>
                  <Select.Item value="A">옵션 A</Select.Item>
                  <Select.Item value="B">옵션 B</Select.Item>
                </Select>
              </div>
            </div>
          </section>
        </div>
      </div>
    </TopbarContainer>
  );
}
