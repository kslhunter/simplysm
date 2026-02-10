import { For } from "solid-js";
import { Kanban, Topbar } from "@simplysm/solid";

interface Card {
  id: number;
  title: string;
  description?: string;
}

interface Lane {
  id: string;
  title: string;
  cards: Card[];
}

const sampleLanes: Lane[] = [
  {
    id: "todo",
    title: "할 일",
    cards: [
      { id: 1, title: "프로젝트 기획서 작성", description: "프로젝트 범위와 일정을 정리합니다." },
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
  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Kanban</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* Section 1: 기본 렌더링 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">기본 렌더링</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              Board에 여러 Lane이 가로 배치되고, Lane 안에 Card가 세로로 나열됩니다.
            </p>
            <div class="h-[500px]">
              <Kanban>
                <For each={sampleLanes}>
                  {(lane) => (
                    <Kanban.Lane value={lane.id}>
                      <Kanban.LaneTitle>{lane.title} ({lane.cards.length})</Kanban.LaneTitle>
                      <Kanban.LaneTools>
                        <button
                          type="button"
                          class="text-sm text-primary-500 hover:text-primary-700"
                        >
                          + 추가
                        </button>
                      </Kanban.LaneTools>
                      <For each={lane.cards}>
                        {(card) => (
                          <Kanban.Card value={card.id} contentClass="p-3">
                            <div class="font-medium">{card.title}</div>
                            {card.description != null && (
                              <div class="mt-1 text-sm text-base-500 dark:text-base-400">
                                {card.description}
                              </div>
                            )}
                          </Kanban.Card>
                        )}
                      </For>
                    </Kanban.Lane>
                  )}
                </For>
              </Kanban>
            </div>
          </section>

          {/* Section 2: 빈 Lane */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">빈 Lane</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              카드가 없는 빈 Lane도 올바르게 렌더링됩니다.
            </p>
            <div class="h-[300px]">
              <Kanban>
                <Kanban.Lane value="empty">
                  <Kanban.LaneTitle>빈 레인</Kanban.LaneTitle>
                </Kanban.Lane>
                <Kanban.Lane value="with-cards">
                  <Kanban.LaneTitle>카드 있음</Kanban.LaneTitle>
                  <Kanban.Card value={1} contentClass="p-3">
                    카드 1
                  </Kanban.Card>
                </Kanban.Lane>
              </Kanban>
            </div>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
