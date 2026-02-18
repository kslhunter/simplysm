import { createSignal, For } from "solid-js";
import { Button, Icon, Kanban, type KanbanDropInfo, Topbar } from "@simplysm/solid";
import { IconPlus } from "@tabler/icons-solidjs";

interface CardData {
  id: number;
  title: string;
}

interface LaneData {
  id: string;
  title: string;
  cards: CardData[];
}

const initialLanes: LaneData[] = [
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

export default function KanbanPage() {
  const [lanes, setLanes] = createSignal<LaneData[]>(initialLanes);
  const [selected, setSelected] = createSignal<number[]>([]);

  const handleDrop = (info: KanbanDropInfo) => {
    const sourceValue = info.sourceValue as number;
    const targetLaneValue = info.targetLaneValue as string;
    const targetCardValue = info.targetCardValue as number | undefined;

    setLanes((prev) => {
      // 소스 카드 찾기 및 제거
      let sourceCard: CardData | undefined;
      const withoutSource = prev.map((lane) => ({
        ...lane,
        cards: lane.cards.filter((card) => {
          if (card.id === sourceValue) {
            sourceCard = card;
            return false;
          }
          return true;
        }),
      }));

      if (!sourceCard) return prev;

      // 대상 레인에 삽입
      return withoutSource.map((lane) => {
        if (lane.id !== targetLaneValue) return lane;

        const newCards = [...lane.cards];

        if (targetCardValue == null) {
          // 빈 영역 드롭 → 맨 끝에 추가
          newCards.push(sourceCard!);
        } else {
          // 특정 카드 앞/뒤에 삽입
          const targetIdx = newCards.findIndex((c) => c.id === targetCardValue);
          if (targetIdx < 0) {
            newCards.push(sourceCard!);
          } else {
            const insertIdx = info.position === "after" ? targetIdx + 1 : targetIdx;
            newCards.splice(insertIdx, 0, sourceCard!);
          }
        }

        return { ...lane, cards: newCards };
      });
    });
  };

  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Kanban</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          <section>
            <h2 class="mb-4 text-xl font-bold">DnD</h2>
            <div class="h-[500px]">
              <Kanban onDrop={handleDrop}>
                <For each={lanes()}>
                  {(lane) => (
                    <Kanban.Lane value={lane.id}>
                      <Kanban.LaneTitle>
                        {lane.title} ({lane.cards.length})
                      </Kanban.LaneTitle>
                      <Kanban.LaneTools>
                        <Button size="sm" theme="primary" variant="ghost" class="size-8">
                          <Icon icon={IconPlus} />
                        </Button>
                      </Kanban.LaneTools>
                      <For each={lane.cards}>
                        {(card) => (
                          <Kanban.Card value={card.id} contentClass="p-2">
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

          <section>
            <h2 class="mb-4 text-xl font-bold">draggable 제어</h2>
            <div class="h-[300px]">
              <Kanban onDrop={handleDrop}>
                <Kanban.Lane value="mixed">
                  <Kanban.LaneTitle>드래그 혼합</Kanban.LaneTitle>
                  <Kanban.Card value={100} contentClass="p-2">
                    드래그 가능 (기본)
                  </Kanban.Card>
                  <Kanban.Card value={101} draggable={false} contentClass="p-2">
                    드래그 불가
                  </Kanban.Card>
                </Kanban.Lane>
                <Kanban.Lane value="empty">
                  <Kanban.LaneTitle>빈 레인</Kanban.LaneTitle>
                </Kanban.Lane>
              </Kanban>
            </div>
          </section>

          <section>
            <h2 class="mb-4 text-xl font-bold">접기/펼치기 + Busy</h2>
            <div class="h-[400px]">
              <Kanban onDrop={handleDrop}>
                <Kanban.Lane value="collapsible-lane" collapsible>
                  <Kanban.LaneTitle>접을 수 있는 레인</Kanban.LaneTitle>
                  <Kanban.LaneTools>
                    <Button size="sm" theme="primary" variant="ghost" class="size-8">
                      <Icon icon={IconPlus} />
                    </Button>
                  </Kanban.LaneTools>
                  <Kanban.Card value={200} contentClass="p-2">
                    카드 A
                  </Kanban.Card>
                  <Kanban.Card value={201} contentClass="p-2">
                    카드 B
                  </Kanban.Card>
                </Kanban.Lane>

                <Kanban.Lane value="busy-lane" busy>
                  <Kanban.LaneTitle>Busy 레인</Kanban.LaneTitle>
                  <Kanban.Card value={210} contentClass="p-2">
                    로딩 중...
                  </Kanban.Card>
                </Kanban.Lane>

                <Kanban.Lane value="both-lane" collapsible busy>
                  <Kanban.LaneTitle>접기 + Busy</Kanban.LaneTitle>
                  <Kanban.Card value={220} contentClass="p-2">
                    접어도 로딩 바가 보임
                  </Kanban.Card>
                </Kanban.Lane>
              </Kanban>
            </div>
          </section>

          <section>
            <h2 class="mb-4 text-xl font-bold">선택</h2>
            <p class="mb-2 text-sm text-base-500">
              Shift+Click으로 카드 선택/해제. 레인 헤더의 체크박스로 전체 선택.
            </p>
            <div class="mb-2 text-sm">
              선택된 카드: {selected().length > 0 ? selected().join(", ") : "(없음)"}
            </div>
            <div class="h-[500px]">
              <Kanban
                selectedValues={selected()}
                onSelectedValuesChange={setSelected}
                onDrop={handleDrop}
              >
                <For each={lanes()}>
                  {(lane) => (
                    <Kanban.Lane value={lane.id}>
                      <Kanban.LaneTitle>
                        {lane.title} ({lane.cards.length})
                      </Kanban.LaneTitle>
                      <Kanban.LaneTools>
                        <Button size="sm" theme="primary" variant="ghost" class="size-8">
                          <Icon icon={IconPlus} />
                        </Button>
                      </Kanban.LaneTools>
                      <For each={lane.cards}>
                        {(card) => (
                          <Kanban.Card value={card.id} selectable draggable contentClass="p-2">
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
        </div>
      </div>
    </Topbar.Container>
  );
}
