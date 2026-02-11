# Calendar Component Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Angular legacy Calendar 컴포넌트를 Solid로 마이그레이션 (일정/이벤트 표시형 월간 캘린더)

**Architecture:** render prop 패턴으로 아이템을 날짜별로 매핑하여 6x7 그리드에 표시. `createPropSignal`로 yearMonth Controlled/Uncontrolled 지원. Table.tsx/Pagination.tsx와 동일한 Tailwind + clsx + twMerge 스타일링 패턴.

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS (clsx + twMerge), DateOnly (core-common)

---

### Task 1: Calendar.tsx 컴포넌트 작성

**Files:**

- Create: `packages/solid/src/components/data/calendar/Calendar.tsx`

**Step 1: Calendar.tsx 파일 작성**

```tsx
import { type Component, createMemo, For, type JSX, splitProps } from "solid-js";
import { DateOnly } from "@simplysm/core-common";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { createPropSignal } from "../../../utils/createPropSignal";

export interface CalendarProps<T> extends Omit<JSX.HTMLAttributes<HTMLTableElement>, "children"> {
  items: T[];
  getItemDate: (item: T, index: number) => DateOnly;
  renderItem: (item: T, index: number) => JSX.Element;
  yearMonth?: DateOnly;
  onYearMonthChange?: (value: DateOnly) => void;
  weekStartDay?: number;
  minDaysInFirstWeek?: number;
}

const WEEKS = ["일", "월", "화", "수", "목", "금", "토"];

const baseClass = clsx(
  "w-full",
  "border-separate border-spacing-0",
  "border-b border-r border-base-300",
  "dark:border-base-600",
  "rounded overflow-hidden",
  // th
  "[&_th]:border-l [&_th]:border-t [&_th]:border-base-300 [&_th]:dark:border-base-600",
  "[&_th]:px-2 [&_th]:py-1",
  "[&_th]:bg-base-100 [&_th]:text-center [&_th]:text-sm [&_th]:font-semibold",
  "[&_th]:dark:bg-base-800",
  // td
  "[&_td]:border-l [&_td]:border-t [&_td]:border-base-300 [&_td]:dark:border-base-600",
  "[&_td]:p-1 [&_td]:align-top",
);

const notCurrentClass = clsx("[&.not-current]:bg-base-50", "[&.not-current]:dark:bg-base-900");

const dayClass = clsx("mb-1 text-sm text-base-500", "dark:text-base-400");

const notCurrentDayClass = clsx("text-base-300", "dark:text-base-600");

const contentClass = clsx("flex flex-col gap-1");

function CalendarBase<T>(props: CalendarProps<T>) {
  const [local, rest] = splitProps(props, [
    "class",
    "items",
    "getItemDate",
    "renderItem",
    "yearMonth",
    "onYearMonthChange",
    "weekStartDay",
    "minDaysInFirstWeek",
  ]);

  const weekStartDay = () => local.weekStartDay ?? 0;
  const minDaysInFirstWeek = () => local.minDaysInFirstWeek ?? 1;

  const [yearMonth] = createPropSignal({
    value: () => local.yearMonth ?? new DateOnly().setDay(1),
    onChange: () => local.onYearMonthChange,
  });

  const weekHeaders = createMemo(() => {
    const start = weekStartDay();
    return Array.from({ length: 7 }, (_, i) => WEEKS[(start + i) % 7]);
  });

  const dataTable = createMemo(() => {
    const ym = yearMonth();
    const items = local.items;
    const getDate = local.getItemDate;

    // 아이템을 날짜별로 그룹핑 (O(N))
    const itemMap = new Map<number, { item: T; index: number }[]>();
    for (let i = 0; i < items.length; i++) {
      const date = getDate(items[i], i);
      const key = date.tick;
      const arr = itemMap.get(key);
      if (arr) {
        arr.push({ item: items[i], index: i });
      } else {
        itemMap.set(key, [{ item: items[i], index: i }]);
      }
    }

    const firstDate = ym.getWeekSeqStartDate(weekStartDay(), minDaysInFirstWeek());
    const result: { date: DateOnly; items: { item: T; index: number }[] }[][] = [];

    for (let r = 0; r < 6; r++) {
      const row: { date: DateOnly; items: { item: T; index: number }[] }[] = [];
      for (let c = 0; c < 7; c++) {
        const date = firstDate.addDays(r * 7 + c);
        row.push({
          date,
          items: itemMap.get(date.tick) ?? [],
        });
      }
      result.push(row);
    }

    return result;
  });

  const getClassName = () => twMerge(baseClass, local.class);

  return (
    <table data-calendar class={getClassName()} {...rest}>
      <thead>
        <tr>
          <For each={weekHeaders()}>{(header) => <th>{header}</th>}</For>
        </tr>
      </thead>
      <tbody>
        <For each={dataTable()}>
          {(row) => (
            <tr>
              <For each={row}>
                {(cell) => (
                  <td class={twMerge(notCurrentClass, cell.date.month !== yearMonth().month && "not-current")}>
                    <div
                      class={cell.date.month !== yearMonth().month ? twMerge(dayClass, notCurrentDayClass) : dayClass}
                    >
                      {cell.date.day}
                    </div>
                    <div class={contentClass}>
                      <For each={cell.items}>{(entry) => local.renderItem(entry.item, entry.index)}</For>
                    </div>
                  </td>
                )}
              </For>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  );
}

export const Calendar = CalendarBase as typeof CalendarBase;
```

**Step 2: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: PASS (에러 없음)

**Step 3: 린트**

Run: `pnpm lint packages/solid/src/components/data/calendar/Calendar.tsx`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/data/calendar/Calendar.tsx
git commit -m "feat(solid): Calendar 컴포넌트 구현"
```

---

### Task 2: index.ts에 Calendar export 추가

**Files:**

- Modify: `packages/solid/src/index.ts:42` (data 섹션)

**Step 1: export 추가**

`// data` 섹션의 `export * from "./components/data/Pagination";` 다음 줄에 추가:

```typescript
export * from "./components/data/calendar/Calendar";
```

**Step 2: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/index.ts
git commit -m "feat(solid): Calendar export 추가"
```

---

### Task 3: CalendarPage.tsx 데모 페이지 작성

**Files:**

- Create: `packages/solid-demo/src/pages/data/CalendarPage.tsx`

**Step 1: 데모 페이지 작성**

```tsx
import { createSignal, For } from "solid-js";
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
  // Section 2: Controlled
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
            <h2 class="mb-4 text-xl font-semibold">기본 사용</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">일정 아이템을 날짜별로 표시합니다.</p>
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
            <h2 class="mb-4 text-xl font-semibold">주 시작 요일: 월요일</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">weekStartDay=1로 월요일부터 시작합니다.</p>
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
            <h2 class="mb-4 text-xl font-semibold">Controlled 연월</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">외부에서 연월 상태를 제어합니다.</p>
            <div class="mb-4 flex items-center gap-2">
              <button
                class="rounded border border-base-300 px-2 py-1 text-sm dark:border-base-600"
                onClick={() => setYearMonth((prev) => prev.addMonths(-1))}
              >
                이전 월
              </button>
              <span class="text-sm font-semibold">
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
```

**Step 2: 라우트 등록**

Modify: `packages/solid-demo/src/main.tsx`

`/home/data/kanban` 라우트 뒤에 추가:

```tsx
<Route path="/home/data/calendar" component={lazy(() => import("./pages/data/CalendarPage"))} />
```

**Step 3: 메뉴 등록**

Modify: `packages/solid-demo/src/pages/Home.tsx`

Data 섹션의 `{ title: "Kanban", href: "/home/data/kanban" }` 뒤에 추가:

```typescript
{ title: "Calendar", href: "/home/data/calendar" },
```

**Step 4: 타입체크**

Run: `pnpm typecheck packages/solid-demo`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid-demo/src/pages/data/CalendarPage.tsx packages/solid-demo/src/main.tsx packages/solid-demo/src/pages/Home.tsx
git commit -m "feat(solid-demo): Calendar 데모 페이지 추가"
```

---

### Task 4: Playwright 수동 테스트

**Step 1: dev 서버 시작**

Run: `pnpm dev` (백그라운드)
Expected: Vite dev server 시작, 포트 확인

**Step 2: Calendar 데모 페이지 접속**

Playwright로 `http://localhost:{포트}/#/home/data/calendar` 접속

**Step 3: 시각적 확인**

확인 항목:

- [ ] 6x7 달력 그리드가 올바르게 렌더링되는가
- [ ] 요일 헤더(일~토)가 표시되는가
- [ ] 아이템이 해당 날짜 셀에 올바르게 배치되는가
- [ ] 현재 월이 아닌 날짜가 시각적으로 구분되는가
- [ ] Section 2: 월요일 시작 캘린더가 올바르게 표시되는가
- [ ] Section 3: 이전/다음 월 버튼 클릭 시 월이 변경되는가
- [ ] 다크 모드 전환 시 스타일이 올바르게 적용되는가

**Step 4: 스크린샷 저장**

`.playwright-mcp/` 디렉토리에 스크린샷 저장

**Step 5: dev 서버 종료**
