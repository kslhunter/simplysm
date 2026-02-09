import { createSignal } from "solid-js";
import { createMutable } from "solid-js/store";
import { DateOnly, DateTime, Time } from "@simplysm/core-common";
import {
  CheckBox,
  DateField,
  DateTimeField,
  NumberField,
  Radio,
  Select,
  Sheet,
  type SortingDef,
  TextAreaField,
  TextField,
  TimeField,
  Topbar,
  TopbarContainer,
} from "@simplysm/solid";

const departments = ["영업", "개발", "인사", "마케팅"];

interface User {
  name?: string;
  age?: number;
  email: string;
  salary: number;
  birthDate?: DateOnly;
  startTime?: Time;
  createdAt?: DateTime;
  memo?: string;
  department?: string;
  active?: boolean;
  vip?: boolean;
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

  const editUsers = createMutable<User[]>([
    {
      name: "홍길동",
      age: 30,
      email: "hong@example.com",
      salary: 5000,
      birthDate: new DateOnly(1994, 5, 15),
      startTime: new Time(9, 0, 0),
      createdAt: new DateTime(2024, 1, 15, 10, 30),
      memo: "팀장",
      department: "개발",
      active: true,
      vip: false,
    },
    {
      name: "김철수",
      age: 25,
      email: "kim@example.com",
      salary: 4200,
      birthDate: new DateOnly(1999, 3, 20),
      startTime: new Time(10, 0, 0),
      createdAt: new DateTime(2024, 3, 1, 9, 0),
      memo: "신입",
      department: "영업",
      active: true,
      vip: false,
    },
    {
      name: "이영희",
      age: 28,
      email: "lee@example.com",
      salary: 4800,
      birthDate: new DateOnly(1996, 8, 10),
      startTime: new Time(9, 30, 0),
      createdAt: new DateTime(2024, 2, 10, 14, 15),
      memo: "대리",
      department: "인사",
      active: false,
      vip: true,
    },
    {
      name: "박민수",
      age: 35,
      email: "park@example.com",
      salary: 5500,
      birthDate: new DateOnly(1989, 12, 1),
      startTime: new Time(8, 30, 0),
      createdAt: new DateTime(2023, 6, 5, 11, 0),
      memo: "과장\n경력 10년",
      department: "마케팅",
      active: true,
      vip: true,
    },
    {
      name: "최지영",
      age: 22,
      email: "choi@example.com",
      salary: 3800,
      birthDate: new DateOnly(2002, 1, 25),
      startTime: new Time(10, 30, 0),
      createdAt: new DateTime(2025, 1, 2, 8, 45),
      memo: "인턴",
      department: "개발",
      active: true,
      vip: false,
    },
  ]);

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
                summary={() => <span class="font-bold">합계: {totalSalary().toLocaleString()}원</span>}
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
            <Sheet items={users} key="sorting" sorts={sorts()} onSortsChange={setSorts} useAutoSort>
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
            <Sheet items={users} key="paging" itemsPerPage={2} page={page()} onPageChange={setPage}>
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

          {/* 인라인 편집 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">인라인 편집</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              inset 컴포넌트를 사용하여 셀 내에서 직접 편집합니다.
            </p>
            <Sheet items={editUsers} key="cell-edit">
              <Sheet.Column<User> key="name" header="이름">
                {(ctx) => (
                  <TextField
                    value={ctx.item.name}
                    onValueChange={(v) => {
                      ctx.item.name = v;
                    }}
                    inset
                  />
                )}
              </Sheet.Column>
              <Sheet.Column<User> key="age" header="나이">
                {(ctx) => (
                  <NumberField
                    value={ctx.item.age}
                    onValueChange={(v) => {
                      ctx.item.age = v;
                    }}
                    inset
                  />
                )}
              </Sheet.Column>
              <Sheet.Column<User> key="birthDate" header="생년월일">
                {(ctx) => (
                  <DateField
                    value={ctx.item.birthDate}
                    onValueChange={(v) => {
                      ctx.item.birthDate = v;
                    }}
                    inset
                  />
                )}
              </Sheet.Column>
              <Sheet.Column<User> key="startTime" header="출근시간">
                {(ctx) => (
                  <TimeField
                    value={ctx.item.startTime}
                    onValueChange={(v) => {
                      ctx.item.startTime = v;
                    }}
                    inset
                  />
                )}
              </Sheet.Column>
              <Sheet.Column<User> key="createdAt" header="생성일시">
                {(ctx) => (
                  <DateTimeField
                    value={ctx.item.createdAt}
                    onValueChange={(v) => {
                      ctx.item.createdAt = v;
                    }}
                    inset
                  />
                )}
              </Sheet.Column>
              <Sheet.Column<User> key="memo" header="메모">
                {(ctx) => (
                  <TextAreaField
                    value={ctx.item.memo}
                    onValueChange={(v) => {
                      ctx.item.memo = v;
                    }}
                    inset
                  />
                )}
              </Sheet.Column>
              <Sheet.Column<User> key="department" header="부서">
                {(ctx) => (
                  <Select
                    value={ctx.item.department}
                    onValueChange={(v) => {
                      ctx.item.department = v as string;
                    }}
                    items={departments}
                    renderValue={(v) => <>{v}</>}
                    inset
                  />
                )}
              </Sheet.Column>
              <Sheet.Column<User> key="active" header="활성">
                {(ctx) => (
                  <CheckBox
                    value={ctx.item.active}
                    onValueChange={(v) => {
                      ctx.item.active = v;
                    }}
                    inset
                  />
                )}
              </Sheet.Column>
              <Sheet.Column<User> key="vip" header="VIP">
                {(ctx) => (
                  <Radio
                    value={ctx.item.vip}
                    onValueChange={(v) => {
                      ctx.item.vip = v;
                    }}
                    inset
                  />
                )}
              </Sheet.Column>
            </Sheet>
          </section>
        </div>
      </div>
    </TopbarContainer>
  );
}
