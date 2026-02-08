import { createSignal } from "solid-js";
import { Sheet, TextField, Topbar, TopbarContainer, type SortingDef } from "@simplysm/solid";

interface User {
  name: string;
  age: number;
  email: string;
  salary: number;
}

const users: User[] = [
  { name: "홍길동", age: 30, email: "hong@example.com", salary: 5000 },
  { name: "김철수", age: 25, email: "kim@example.com", salary: 4200 },
  { name: "이영희", age: 28, email: "lee@example.com", salary: 4800 },
  { name: "박민수", age: 35, email: "park@example.com", salary: 5500 },
  { name: "최지영", age: 22, email: "choi@example.com", salary: 3800 },
];

interface Category {
  name: string;
  count: number;
  children?: Category[];
}

const categories: Category[] = [
  {
    name: "전자제품",
    count: 150,
    children: [
      {
        name: "컴퓨터",
        count: 80,
        children: [
          { name: "노트북", count: 45 },
          { name: "데스크톱", count: 35 },
        ],
      },
      {
        name: "모바일",
        count: 70,
        children: [
          { name: "스마트폰", count: 50 },
          { name: "태블릿", count: 20 },
        ],
      },
    ],
  },
  {
    name: "의류",
    count: 200,
    children: [
      { name: "상의", count: 120 },
      { name: "하의", count: 80 },
    ],
  },
  { name: "식품", count: 300 },
];

export default function SheetPage() {
  const totalSalary = () => users.reduce((sum, u) => sum + u.salary, 0);
  const [sorts, setSorts] = createSignal<SortingDef[]>([]);
  const [page, setPage] = createSignal(0);
  const [expanded, setExpanded] = createSignal<Category[]>([]);

  const [editUsers, setEditUsers] = createSignal<User[]>([
    { name: "홍길동", age: 30, email: "hong@example.com", salary: 5000 },
    { name: "김철수", age: 25, email: "kim@example.com", salary: 4200 },
    { name: "이영희", age: 28, email: "lee@example.com", salary: 4800 },
    { name: "박민수", age: 35, email: "park@example.com", salary: 5500 },
    { name: "최지영", age: 22, email: "choi@example.com", salary: 3800 },
  ]);

  function updateEditUser(index: number, field: keyof User, value: string | number): void {
    setEditUsers((prev) => prev.map((u, i) => i === index ? { ...u, [field]: value } : u));
  }

  return (
    <TopbarContainer>
      <Topbar>
        <h1 class="m-0 text-base">Sheet</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* 기본 테이블 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">기본 테이블</h2>
            <Sheet items={users} key="basic">
              <Sheet.Column<User> key="name" header="이름" class="px-2 py-1">
                {(ctx) => ctx.item.name}
              </Sheet.Column>
              <Sheet.Column<User> key="age" header="나이" class="px-2 py-1">
                {(ctx) => ctx.item.age}
              </Sheet.Column>
              <Sheet.Column<User> key="email" header="이메일" class="px-2 py-1">
                {(ctx) => ctx.item.email}
              </Sheet.Column>
            </Sheet>
          </section>

          {/* 다단계 헤더 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">다단계 헤더</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              header에 배열을 전달하면 다단계 헤더가 생성됩니다. 같은 그룹명은 자동으로 병합됩니다.
            </p>
            <Sheet items={users} key="multi-header">
              <Sheet.Column<User> key="name" header={["기본정보", "이름"]} class="px-2 py-1">
                {(ctx) => ctx.item.name}
              </Sheet.Column>
              <Sheet.Column<User> key="age" header={["기본정보", "나이"]} class="px-2 py-1">
                {(ctx) => ctx.item.age}
              </Sheet.Column>
              <Sheet.Column<User> key="email" header={["연락처", "이메일"]} class="px-2 py-1">
                {(ctx) => ctx.item.email}
              </Sheet.Column>
              <Sheet.Column<User> key="salary" header="급여" class="px-2 py-1 text-right">
                {(ctx) => <>{ctx.item.salary.toLocaleString()}원</>}
              </Sheet.Column>
            </Sheet>
          </section>

          {/* 합계 행 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">합계 행</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              summary prop으로 합계 행을 추가합니다. thead 내에 배치되어 스크롤 시 상단에 고정됩니다.
            </p>
            <Sheet items={users} key="summary">
              <Sheet.Column<User> key="name" header="이름" class="px-2 py-1">
                {(ctx) => ctx.item.name}
              </Sheet.Column>
              <Sheet.Column<User>
                key="salary"
                header="급여"
                class="px-2 py-1 text-right"
                summary={() => (
                  <span class="font-bold">합계: {totalSalary().toLocaleString()}원</span>
                )}
              >
                {(ctx) => <>{ctx.item.salary.toLocaleString()}원</>}
              </Sheet.Column>
            </Sheet>
          </section>

          {/* 정렬 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">정렬</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              헤더 클릭으로 정렬 토글. Shift+Click으로 다중 정렬. useAutoSort로 자동 정렬 적용.
            </p>
            <Sheet
              items={users}
              key="sorting"
              sorts={sorts()}
              onSortsChange={setSorts}
              useAutoSort
            >
              <Sheet.Column<User> key="name" header="이름" class="px-2 py-1">
                {(ctx) => ctx.item.name}
              </Sheet.Column>
              <Sheet.Column<User> key="age" header="나이" class="px-2 py-1">
                {(ctx) => ctx.item.age}
              </Sheet.Column>
              <Sheet.Column<User> key="salary" header="급여" class="px-2 py-1 text-right">
                {(ctx) => <>{ctx.item.salary.toLocaleString()}원</>}
              </Sheet.Column>
              <Sheet.Column<User> key="email" header="이메일 (정렬 불가)" class="px-2 py-1" disableSorting>
                {(ctx) => ctx.item.email}
              </Sheet.Column>
            </Sheet>
          </section>

          {/* 페이지네이션 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">페이지네이션</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              itemsPerPage를 설정하면 자동으로 페이지네이션이 표시됩니다.
            </p>
            <Sheet
              items={users}
              key="paging"
              itemsPerPage={2}
              currentPage={page()}
              onCurrentPageChange={setPage}
            >
              <Sheet.Column<User> key="name" header="이름" class="px-2 py-1">
                {(ctx) => ctx.item.name}
              </Sheet.Column>
              <Sheet.Column<User> key="age" header="나이" class="px-2 py-1">
                {(ctx) => ctx.item.age}
              </Sheet.Column>
              <Sheet.Column<User> key="salary" header="급여" class="px-2 py-1 text-right">
                {(ctx) => <>{ctx.item.salary.toLocaleString()}원</>}
              </Sheet.Column>
            </Sheet>
          </section>

          {/* 트리 확장 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">트리 확장</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              getChildrenFn으로 트리 구조를 정의합니다. 캐럿 아이콘으로 펼침/접기, 세로선 가이드로 깊이를 표현합니다.
            </p>
            <Sheet
              items={categories}
              key="tree"
              getChildrenFn={(item) => item.children}
              expandedItems={expanded()}
              onExpandedItemsChange={setExpanded}
            >
              <Sheet.Column<Category> key="name" header="카테고리" class="px-2 py-1">
                {(ctx) => ctx.item.name}
              </Sheet.Column>
              <Sheet.Column<Category> key="count" header="상품 수" class="px-2 py-1 text-right">
                {(ctx) => <>{ctx.item.count.toLocaleString()}개</>}
              </Sheet.Column>
            </Sheet>
          </section>

          {/* 고정 컬럼 + 리사이징 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">고정 컬럼 + 리사이징</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              fixed 컬럼은 스크롤 시 좌측에 고정됩니다. 헤더 우측 드래그로 너비 변경, 더블클릭으로 초기화.
            </p>
            <div>
              <Sheet items={users} key="fixed-resize">
                <Sheet.Column<User> key="name" header="이름" class="px-2 py-1 font-medium" fixed>
                  {(ctx) => ctx.item.name}
                </Sheet.Column>
                <Sheet.Column<User> key="age" header="나이" class="px-2 py-1" fixed>
                  {(ctx) => ctx.item.age}
                </Sheet.Column>
                <Sheet.Column<User> key="email" header="이메일" class="px-2 py-1">
                  {(ctx) => ctx.item.email}
                </Sheet.Column>
                <Sheet.Column<User> key="salary" header="급여" class="px-2 py-1 text-right">
                  {(ctx) => <>{ctx.item.salary.toLocaleString()}원</>}
                </Sheet.Column>
              </Sheet>
            </div>
          </section>

          {/* 셀 편집 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">셀 편집</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              셀을 클릭하여 포커스 후, F2 또는 더블클릭으로 편집 모드 진입. Arrow/Enter/Tab으로 네비게이션. Escape로 편집 해제.
            </p>
            <Sheet items={editUsers()} key="cell-edit" focusMode="cell">
              <Sheet.Column<User> key="name" header="이름">
                {(ctx) => (
                  <TextField
                    value={ctx.item.name}
                    onValueChange={(v) => updateEditUser(ctx.index, "name", v)}
                    readonly={!ctx.edit}
                    inset
                  />
                )}
              </Sheet.Column>
              <Sheet.Column<User> key="age" header="나이">
                {(ctx) => (
                  <TextField
                    value={String(ctx.item.age)}
                    onValueChange={(v) => updateEditUser(ctx.index, "age", Number(v))}
                    readonly={!ctx.edit}
                    inset
                  />
                )}
              </Sheet.Column>
              <Sheet.Column<User> key="email" header="이메일" class="px-2 py-1">
                {(ctx) => ctx.item.email}
              </Sheet.Column>
              <Sheet.Column<User> key="salary" header="급여" class="px-2 py-1 text-right">
                {(ctx) => <>{ctx.item.salary.toLocaleString()}원</>}
              </Sheet.Column>
            </Sheet>
          </section>

          {/* 행 포커스 모드 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">행 포커스 모드</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              focusMode="row"일 때 셀 인디케이터 대신 행 인디케이터만 표시됩니다.
            </p>
            <Sheet items={users} key="row-focus" focusMode="row">
              <Sheet.Column<User> key="name" header="이름" class="px-2 py-1">
                {(ctx) => ctx.item.name}
              </Sheet.Column>
              <Sheet.Column<User> key="age" header="나이" class="px-2 py-1">
                {(ctx) => ctx.item.age}
              </Sheet.Column>
              <Sheet.Column<User> key="email" header="이메일" class="px-2 py-1">
                {(ctx) => ctx.item.email}
              </Sheet.Column>
            </Sheet>
          </section>
        </div>
      </div>
    </TopbarContainer>
  );
}
