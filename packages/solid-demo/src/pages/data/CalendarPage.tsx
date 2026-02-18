import { createSignal } from "solid-js";
import { Calendar, Topbar } from "@simplysm/solid";
import { DateOnly } from "@simplysm/core-common";

interface ScheduleItem {
  id: number;
  title: string;
  date: DateOnly;
}

const sampleItems: ScheduleItem[] = [
  { id: 1, title: "팀 미팅", date: new DateOnly(2026, 2, 3) },
  { id: 2, title: "코드 리뷰", date: new DateOnly(2026, 2, 5) },
  { id: 3, title: "배포", date: new DateOnly(2026, 2, 5) },
  { id: 4, title: "스프린트 회고", date: new DateOnly(2026, 2, 14) },
  { id: 5, title: "기획 회의", date: new DateOnly(2026, 2, 20) },
  { id: 6, title: "릴리즈", date: new DateOnly(2026, 2, 28) },
];

export default function CalendarPage() {
  // Section 3: Controlled
  const [yearMonth, setYearMonth] = createSignal(new DateOnly(2026, 2, 1));

  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Calendar</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* Section 1: 기본 사용 */}
          <section>
            <h2 class="mb-4 text-xl font-bold">기본 사용</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              일정 아이템을 날짜별로 표시합니다.
            </p>
            <Calendar<ScheduleItem>
              items={sampleItems}
              getItemDate={(item) => item.date}
              yearMonth={new DateOnly(2026, 2, 1)}
              renderItem={(item) => (
                <div class="rounded bg-primary-100 px-1 text-xs text-primary-800 dark:bg-primary-900/40 dark:text-primary-200">
                  {item.title}
                </div>
              )}
            />
          </section>

          {/* Section 2: 주 시작 요일 변경 (월요일) */}
          <section>
            <h2 class="mb-4 text-xl font-bold">주 시작 요일: 월요일</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              weekStartDay=1로 월요일부터 시작합니다.
            </p>
            <Calendar<ScheduleItem>
              items={sampleItems}
              getItemDate={(item) => item.date}
              yearMonth={new DateOnly(2026, 2, 1)}
              weekStartDay={1}
              renderItem={(item) => (
                <div class="rounded bg-success-100 px-1 text-xs text-success-800 dark:bg-success-900/40 dark:text-success-200">
                  {item.title}
                </div>
              )}
            />
          </section>

          {/* Section 3: Controlled 연월 */}
          <section>
            <h2 class="mb-4 text-xl font-bold">Controlled 연월</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              외부에서 연월 상태를 제어합니다.
            </p>
            <div class="mb-4 flex items-center gap-2">
              <button
                class="rounded border border-base-300 px-2 py-1 text-sm dark:border-base-600"
                onClick={() => setYearMonth((prev) => prev.addMonths(-1))}
              >
                이전 월
              </button>
              <span class="text-sm font-bold">
                {yearMonth().year}년 {yearMonth().month}월
              </span>
              <button
                class="rounded border border-base-300 px-2 py-1 text-sm dark:border-base-600"
                onClick={() => setYearMonth((prev) => prev.addMonths(1))}
              >
                다음 월
              </button>
            </div>
            <Calendar<ScheduleItem>
              items={sampleItems}
              getItemDate={(item) => item.date}
              yearMonth={yearMonth()}
              onYearMonthChange={setYearMonth}
              renderItem={(item) => (
                <div class="rounded bg-warning-100 px-1 text-xs text-warning-800 dark:bg-warning-900/40 dark:text-warning-200">
                  {item.title}
                </div>
              )}
            />
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
