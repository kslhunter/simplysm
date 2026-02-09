import { createSignal, For } from "solid-js";
import { Kanban, Topbar } from "@simplysm/solid";
import type { KanbanDropInfo } from "@simplysm/solid";

interface Card {
  id: number;
  title: string;
}

interface Lane {
  id: string;
  title: string;
  cards: Card[];
}

const initialLanes: Lane[] = [
  {
    id: "todo",
    title: "할 일",
    cards: [
      { id: 1, title: "프로젝트 기획서 작성" },
      { id: 2, title: "디자인 시안 검토" },
      { id: 3, title: "API 스펙 정의" },
    ],
  },
  {
    id: "in-progress",
    title: "진행 중",
    cards: [
      { id: 4, title: "로그인 페이지 개발" },
      { id: 5, title: "DB 스키마 설계" },
    ],
  },
  {
    id: "done",
    title: "완료",
    cards: [
      { id: 6, title: "환경 설정" },
      { id: 7, title: "Git 저장소 생성" },
    ],
  },
];

function cloneLanes(lanes: Lane[]): Lane[] {
  return lanes.map((lane) => ({
    ...lane,
    cards: [...lane.cards],
  }));
}

function moveCard(
  lanes: Lane[],
  info: KanbanDropInfo<string, number>,
): Lane[] {
  const result = cloneLanes(lanes);

  // 소스 카드 찾기
  let sourceCard: Card | undefined;
  for (const lane of result) {
    const idx = lane.cards.findIndex((c) => c.id === info.sourceCardValue);
    if (idx >= 0) {
      sourceCard = lane.cards[idx];
      lane.cards.splice(idx, 1);
      break;
    }
  }
  if (!sourceCard) return lanes;

  // 타겟 Lane에 삽입
  const targetLane = result.find((l) => l.id === info.targetLaneValue);
  if (!targetLane) return lanes;

  if (info.targetCardValue != null) {
    const targetIdx = targetLane.cards.findIndex((c) => c.id === info.targetCardValue);
    if (targetIdx >= 0) {
      targetLane.cards.splice(targetIdx, 0, sourceCard);
    } else {
      targetLane.cards.push(sourceCard);
    }
  } else {
    targetLane.cards.push(sourceCard);
  }

  return result;
}

export default function KanbanPage() {
  // Section 1: 기본 DnD
  const [lanes1, setLanes1] = createSignal<Lane[]>(cloneLanes(initialLanes));

  const handleDrop1 = (info: KanbanDropInfo<string, number>) => {
    setLanes1((prev) => moveCard(prev, info));
  };

  // Section 2: 접기/펼치기
  const [lanes2, setLanes2] = createSignal<Lane[]>(cloneLanes(initialLanes));

  const handleDrop2 = (info: KanbanDropInfo<string, number>) => {
    setLanes2((prev) => moveCard(prev, info));
  };

  // Section 3: 선택
  const [lanes3, setLanes3] = createSignal<Lane[]>(cloneLanes(initialLanes));
  const [selectedCards, setSelectedCards] = createSignal<number[]>([]);

  const handleDrop3 = (info: KanbanDropInfo<string, number>) => {
    setLanes3((prev) => moveCard(prev, info));
  };

  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Kanban</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* Section 1: 기본 Kanban (DnD) */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">기본 Kanban (DnD)</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              카드를 드래그하여 다른 Lane으로 이동할 수 있습니다.
            </p>
            <div class="h-[500px]">
              <Kanban<string, number> onCardDrop={handleDrop1}>
                <For each={lanes1()}>
                  {(lane) => (
                    <Kanban.Lane value={lane.id}>
                      <Kanban.LaneTitle>{lane.title}</Kanban.LaneTitle>
                      <For each={lane.cards}>
                        {(card) => (
                          <Kanban.Card value={card.id} draggable class="p-3">
                            {card.title}
                          </Kanban.Card>
                        )}
                      </For>
                    </Kanban.Lane>
                  )}
                </For>
              </Kanban>
            </div>
          </section>

          {/* Section 2: 접기/펼치기 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">접기/펼치기</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              Lane 헤더의 화살표를 클릭하여 접고 펼칠 수 있습니다.
            </p>
            <div class="h-[500px]">
              <Kanban<string, number> onCardDrop={handleDrop2}>
                <For each={lanes2()}>
                  {(lane) => (
                    <Kanban.Lane value={lane.id} collapsible>
                      <Kanban.LaneTitle>{lane.title}</Kanban.LaneTitle>
                      <For each={lane.cards}>
                        {(card) => (
                          <Kanban.Card value={card.id} draggable class="p-3">
                            {card.title}
                          </Kanban.Card>
                        )}
                      </For>
                    </Kanban.Lane>
                  )}
                </For>
              </Kanban>
            </div>
          </section>

          {/* Section 3: 선택 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">선택</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              Shift+Click으로 카드를 선택하세요.
            </p>
            <div class="h-[500px]">
              <Kanban<string, number>
                onCardDrop={handleDrop3}
                value={selectedCards()}
                onValueChange={setSelectedCards}
              >
                <For each={lanes3()}>
                  {(lane) => (
                    <Kanban.Lane value={lane.id}>
                      <Kanban.LaneTitle>{lane.title}</Kanban.LaneTitle>
                      <For each={lane.cards}>
                        {(card) => (
                          <Kanban.Card value={card.id} draggable class="p-3">
                            {card.title}
                          </Kanban.Card>
                        )}
                      </For>
                    </Kanban.Lane>
                  )}
                </For>
              </Kanban>
            </div>
            <p class="mt-4 text-sm text-base-600 dark:text-base-400">
              선택된 카드 ID: {JSON.stringify(selectedCards())}
            </p>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
