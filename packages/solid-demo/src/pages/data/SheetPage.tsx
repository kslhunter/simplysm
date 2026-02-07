import { createSignal } from "solid-js";
import { Sheet, Topbar, TopbarContainer, type SortingDef } from "@simplysm/solid";

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

export default function SheetPage() {
  const totalSalary = () => users.reduce((sum, u) => sum + u.salary, 0);
  const [sorts, setSorts] = createSignal<SortingDef[]>([]);
  const [page, setPage] = createSignal(0);

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
              <Sheet.Column<User> key="name" header="이름" width="120px">
                {(ctx) => <div class="px-2 py-1">{ctx.item.name}</div>}
              </Sheet.Column>
              <Sheet.Column<User> key="age" header="나이" width="80px">
                {(ctx) => <div class="px-2 py-1">{ctx.item.age}</div>}
              </Sheet.Column>
              <Sheet.Column<User> key="email" header="이메일" width="200px">
                {(ctx) => <div class="px-2 py-1">{ctx.item.email}</div>}
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
              <Sheet.Column<User> key="name" header={["기본정보", "이름"]} width="120px">
                {(ctx) => <div class="px-2 py-1">{ctx.item.name}</div>}
              </Sheet.Column>
              <Sheet.Column<User> key="age" header={["기본정보", "나이"]} width="80px">
                {(ctx) => <div class="px-2 py-1">{ctx.item.age}</div>}
              </Sheet.Column>
              <Sheet.Column<User> key="email" header={["연락처", "이메일"]} width="200px">
                {(ctx) => <div class="px-2 py-1">{ctx.item.email}</div>}
              </Sheet.Column>
              <Sheet.Column<User> key="salary" header="급여" width="120px">
                {(ctx) => (
                  <div class="px-2 py-1 text-right">
                    {ctx.item.salary.toLocaleString()}원
                  </div>
                )}
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
              <Sheet.Column<User> key="name" header="이름" width="120px">
                {(ctx) => <div class="px-2 py-1">{ctx.item.name}</div>}
              </Sheet.Column>
              <Sheet.Column<User>
                key="salary"
                header="급여"
                width="150px"
                summary={() => (
                  <span class="font-bold">합계: {totalSalary().toLocaleString()}원</span>
                )}
              >
                {(ctx) => (
                  <div class="px-2 py-1 text-right">
                    {ctx.item.salary.toLocaleString()}원
                  </div>
                )}
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
              <Sheet.Column<User> key="name" header="이름" width="120px">
                {(ctx) => <div class="px-2 py-1">{ctx.item.name}</div>}
              </Sheet.Column>
              <Sheet.Column<User> key="age" header="나이" width="80px">
                {(ctx) => <div class="px-2 py-1">{ctx.item.age}</div>}
              </Sheet.Column>
              <Sheet.Column<User> key="salary" header="급여" width="120px">
                {(ctx) => (
                  <div class="px-2 py-1 text-right">
                    {ctx.item.salary.toLocaleString()}원
                  </div>
                )}
              </Sheet.Column>
              <Sheet.Column<User> key="email" header="이메일 (정렬 불가)" width="200px" disableSorting>
                {(ctx) => <div class="px-2 py-1">{ctx.item.email}</div>}
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
              <Sheet.Column<User> key="name" header="이름" width="120px">
                {(ctx) => <div class="px-2 py-1">{ctx.item.name}</div>}
              </Sheet.Column>
              <Sheet.Column<User> key="age" header="나이" width="80px">
                {(ctx) => <div class="px-2 py-1">{ctx.item.age}</div>}
              </Sheet.Column>
              <Sheet.Column<User> key="salary" header="급여" width="120px">
                {(ctx) => (
                  <div class="px-2 py-1 text-right">
                    {ctx.item.salary.toLocaleString()}원
                  </div>
                )}
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
                <Sheet.Column<User> key="name" header="이름" width="120px" fixed>
                  {(ctx) => <div class="px-2 py-1 font-medium">{ctx.item.name}</div>}
                </Sheet.Column>
                <Sheet.Column<User> key="age" header="나이" width="80px" fixed>
                  {(ctx) => <div class="px-2 py-1">{ctx.item.age}</div>}
                </Sheet.Column>
                <Sheet.Column<User> key="email" header="이메일" width="200px">
                  {(ctx) => <div class="px-2 py-1">{ctx.item.email}</div>}
                </Sheet.Column>
                <Sheet.Column<User> key="salary" header="급여" width="150px">
                  {(ctx) => (
                    <div class="px-2 py-1 text-right">
                      {ctx.item.salary.toLocaleString()}원
                    </div>
                  )}
                </Sheet.Column>
              </Sheet>
            </div>
          </section>
        </div>
      </div>
    </TopbarContainer>
  );
}
