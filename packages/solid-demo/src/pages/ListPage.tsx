import { createSignal, For } from "solid-js";
import { SdList, SdListItem, SdButton } from "@simplysm/solid";
import { IconCheck, IconStar } from "@tabler/icons-solidjs";

export default function ListPage() {
  // 인터랙티브 데모 상태
  const [selectedItems, setSelectedItems] = createSignal<string[]>([]);
  const [favoriteItems, setFavoriteItems] = createSignal<string[]>(["item2"]);
  const [openAccordion, setOpenAccordion] = createSignal<string | null>(null);

  const toggleSelection = (item: string) => {
    setSelectedItems((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
  };

  const toggleFavorite = (item: string) => {
    setFavoriteItems((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
  };

  return (
    <div class="space-y-8 p-8">
      <h1 class="mb-6 text-3xl font-bold">리스트 데모</h1>

      {/* 기본 리스트 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">기본 리스트</h2>
        <SdList >
          <SdListItem>항목 1</SdListItem>
          <SdListItem>항목 2</SdListItem>
          <SdListItem>항목 3</SdListItem>
        </SdList>
      </section>

      {/* 선택 상태 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">선택 상태 (selected)</h2>
        <SdList >
          <SdListItem>일반 항목</SdListItem>
          <SdListItem selected>선택된 항목</SdListItem>
          <SdListItem>일반 항목</SdListItem>
        </SdList>
      </section>

      {/* selectedIcon 사용 (체크 아이콘) */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">selectedIcon (체크 아이콘)</h2>
        <SdList >
          <SdListItem selectedIcon={IconCheck}>미선택 항목</SdListItem>
          <SdListItem selectedIcon={IconCheck} selected>
            선택된 항목
          </SdListItem>
          <SdListItem selectedIcon={IconCheck}>미선택 항목</SdListItem>
        </SdList>
      </section>

      {/* selectedIcon 사용 (별 아이콘) */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">selectedIcon (별 아이콘)</h2>
        <SdList >
          <SdListItem selectedIcon={IconStar}>
            일반
          </SdListItem>
          <SdListItem selectedIcon={IconStar} selected>
            즐겨찾기
          </SdListItem>
          <SdListItem selectedIcon={IconStar}>
            일반
          </SdListItem>
        </SdList>
      </section>

      {/* 읽기 전용 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">읽기 전용 (readonly)</h2>
        <SdList >
          <SdListItem readonly>읽기 전용 항목 1</SdListItem>
          <SdListItem readonly>읽기 전용 항목 2</SdListItem>
          <SdListItem readonly>읽기 전용 항목 3</SdListItem>
        </SdList>
      </section>

      {/* 인셋 모드 - 배경이 투명하여 부모 배경이 보임 (사이드바 메뉴 등에서 사용) */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">인셋 모드 (inset)</h2>
        <SdList inset >
          <SdListItem>인셋 항목 1</SdListItem>
          <SdListItem selected>인셋 항목 2 (선택됨)</SdListItem>
          <SdListItem>인셋 항목 3</SdListItem>
        </SdList>
      </section>

      {/* 아코디언 레이아웃 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">아코디언 레이아웃 (중첩 리스트)</h2>
        <SdList >
          <SdListItem>단일 항목</SdListItem>
          <SdListItem
            layout="accordion"
            childList={
              <SdList inset>
                <SdListItem>하위 항목 1-1</SdListItem>
                <SdListItem>하위 항목 1-2</SdListItem>
              </SdList>
            }
          >
            그룹 1
          </SdListItem>
          <SdListItem
            layout="accordion"
            childList={
              <SdList inset>
                <SdListItem>하위 항목 2-1</SdListItem>
                <SdListItem>하위 항목 2-2</SdListItem>
                <SdListItem>하위 항목 2-3</SdListItem>
              </SdList>
            }
          >
            그룹 2
          </SdListItem>
        </SdList>
      </section>

      {/* Flat 레이아웃 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">Flat 레이아웃 (항상 펼침)</h2>
        <SdList >
          <SdListItem
            layout="flat"
            childList={
              <SdList inset>
                <SdListItem>항목 A-1</SdListItem>
                <SdListItem>항목 A-2</SdListItem>
              </SdList>
            }
          >
            카테고리 A
          </SdListItem>
          <SdListItem
            layout="flat"
            childList={
              <SdList inset>
                <SdListItem>항목 B-1</SdListItem>
                <SdListItem selected>항목 B-2 (선택됨)</SdListItem>
              </SdList>
            }
          >
            카테고리 B
          </SdListItem>
        </SdList>
      </section>

      {/* Tool 슬롯 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">Tool 슬롯</h2>
        <SdList >
          <SdListItem tool={<SdButton size="sm">편집</SdButton>}>편집 가능한 항목</SdListItem>
          <SdListItem
            tool={
              <SdButton theme="danger" size="sm">
                삭제
              </SdButton>
            }
          >
            삭제 가능한 항목
          </SdListItem>
          <SdListItem
            tool={
              <div class="flex gap-1">
                <SdButton size="sm">수정</SdButton>
                <SdButton theme="danger" size="sm">
                  삭제
                </SdButton>
              </div>
            }
          >
            여러 도구
          </SdListItem>
        </SdList>
      </section>

      {/* 인터랙티브 데모 - 다중 선택 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">인터랙티브 데모 - 다중 선택</h2>
        <p class="mb-2 text-sm text-gray-500">선택됨: {selectedItems().join(", ") || "없음"}</p>
        <SdList >
          <For each={["apple", "banana", "cherry", "date"]}>
            {(item) => (
              <SdListItem
                selectedIcon={IconCheck}
                selected={selectedItems().includes(item)}
                onClick={() => toggleSelection(item)}
              >
                {item}
              </SdListItem>
            )}
          </For>
        </SdList>
      </section>

      {/* 인터랙티브 데모 - 즐겨찾기 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">인터랙티브 데모 - 즐겨찾기</h2>
        <p class="mb-2 text-sm text-gray-500">즐겨찾기: {favoriteItems().join(", ") || "없음"}</p>
        <SdList >
          <For each={["item1", "item2", "item3"]}>
            {(item) => (
              <SdListItem
                selectedIcon={IconStar}
                selected={favoriteItems().includes(item)}
                onClick={() => toggleFavorite(item)}
              >
                {item}
              </SdListItem>
            )}
          </For>
        </SdList>
      </section>

      {/* 인터랙티브 데모 - Controlled 아코디언 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">인터랙티브 데모 - Controlled 아코디언</h2>
        <p class="mb-2 text-sm text-gray-500">열린 섹션: {openAccordion() ?? "없음"}</p>
        <SdList >
          <For each={["section1", "section2", "section3"]}>
            {(id) => (
              <SdListItem
                layout="accordion"
                open={openAccordion() === id}
                onOpenChange={(open) => {
                  if (open) {
                    setOpenAccordion(id);
                  } else if (openAccordion() === id) {
                    setOpenAccordion(null);
                  }
                }}
                childList={
                  <SdList inset>
                    <SdListItem>하위 항목 1</SdListItem>
                    <SdListItem>하위 항목 2</SdListItem>
                  </SdList>
                }
              >
                {id}
              </SdListItem>
            )}
          </For>
        </SdList>
      </section>
    </div>
  );
}
