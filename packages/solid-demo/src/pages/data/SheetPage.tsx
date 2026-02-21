import { createSignal } from "solid-js";
import { createMutable } from "solid-js/store";
import { DateOnly, DateTime, Time } from "@simplysm/core-common";
import {
  Checkbox,
  DatePicker,
  DateTimePicker,
  NumberInput,
  Radio,
  Select,
  DataSheet,
  type SortingDef,
  Textarea,
  TextInput,
  TimePicker,
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
  const [page, setPage] = createSignal(1);
  const [expanded, setExpanded] = createSignal<Category[]>([]);
  const [multiSelected, setMultiSelected] = createSignal<User[]>([]);
  const [singleSelected, setSingleSelected] = createSignal<User[]>([]);
  const [disabledSelected, setDisabledSelected] = createSignal<User[]>([]);
  const [reorderItems, setReorderItems] = createSignal([...users]);

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
    <div class="space-y-8 p-6">
      {/* 기본 테이블 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">기본 테이블</h2>
        <DataSheet items={users} persistKey="basic">
          <DataSheet.Column<User> key="name" header="이름" class="px-2 py-1">
            {(ctx) => ctx.item.name}
          </DataSheet.Column>
          <DataSheet.Column<User> key="age" header="나이" class="px-2 py-1">
            {(ctx) => ctx.item.age}
          </DataSheet.Column>
          <DataSheet.Column<User> key="email" header="이메일" class="px-2 py-1">
            {(ctx) => ctx.item.email}
          </DataSheet.Column>
        </DataSheet>
      </section>

      {/* 다단계 헤더 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">다단계 헤더</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          header에 배열을 전달하면 다단계 헤더가 생성됩니다. 같은 그룹명은 자동으로 병합됩니다.
        </p>
        <DataSheet items={users} persistKey="multi-header">
          <DataSheet.Column<User> key="name" header={["기본정보", "이름"]} class="px-2 py-1">
            {(ctx) => ctx.item.name}
          </DataSheet.Column>
          <DataSheet.Column<User> key="age" header={["기본정보", "나이"]} class="px-2 py-1">
            {(ctx) => ctx.item.age}
          </DataSheet.Column>
          <DataSheet.Column<User> key="email" header={["연락처", "이메일"]} class="px-2 py-1">
            {(ctx) => ctx.item.email}
          </DataSheet.Column>
          <DataSheet.Column<User> key="salary" header="급여" class="px-2 py-1 text-right">
            {(ctx) => <>{ctx.item.salary.toLocaleString()}원</>}
          </DataSheet.Column>
        </DataSheet>
      </section>

      {/* 합계 행 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">합계 행</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          summary prop으로 합계 행을 추가합니다. thead 내에 배치되어 스크롤 시 상단에 고정됩니다.
        </p>
        <DataSheet items={users} persistKey="summary">
          <DataSheet.Column<User> key="name" header="이름" class="px-2 py-1">
            {(ctx) => ctx.item.name}
          </DataSheet.Column>
          <DataSheet.Column<User>
            key="salary"
            header="급여"
            class="px-2 py-1 text-right"
            summary={() => <span class="font-bold">합계: {totalSalary().toLocaleString()}원</span>}
          >
            {(ctx) => <>{ctx.item.salary.toLocaleString()}원</>}
          </DataSheet.Column>
        </DataSheet>
      </section>

      {/* 정렬 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">정렬</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          헤더 클릭으로 정렬 토글. Shift+Click으로 다중 정렬. autoSort로 자동 정렬 적용.
        </p>
        <DataSheet
          items={users}
          persistKey="sorting"
          sorts={sorts()}
          onSortsChange={setSorts}
          autoSort
        >
          <DataSheet.Column<User> key="name" header="이름" class="px-2 py-1">
            {(ctx) => ctx.item.name}
          </DataSheet.Column>
          <DataSheet.Column<User> key="age" header="나이" class="px-2 py-1">
            {(ctx) => ctx.item.age}
          </DataSheet.Column>
          <DataSheet.Column<User> key="salary" header="급여" class="px-2 py-1 text-right">
            {(ctx) => <>{ctx.item.salary.toLocaleString()}원</>}
          </DataSheet.Column>
          <DataSheet.Column<User>
            key="email"
            header="이메일 (정렬 불가)"
            class="px-2 py-1"
            sortable={false}
          >
            {(ctx) => ctx.item.email}
          </DataSheet.Column>
        </DataSheet>
      </section>

      {/* 페이지네이션 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">페이지네이션</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          itemsPerPage를 설정하면 자동으로 페이지네이션이 표시됩니다.
        </p>
        <DataSheet
          items={users}
          persistKey="paging"
          itemsPerPage={2}
          page={page()}
          onPageChange={setPage}
        >
          <DataSheet.Column<User> key="name" header="이름" class="px-2 py-1">
            {(ctx) => ctx.item.name}
          </DataSheet.Column>
          <DataSheet.Column<User> key="age" header="나이" class="px-2 py-1">
            {(ctx) => ctx.item.age}
          </DataSheet.Column>
          <DataSheet.Column<User> key="salary" header="급여" class="px-2 py-1 text-right">
            {(ctx) => <>{ctx.item.salary.toLocaleString()}원</>}
          </DataSheet.Column>
        </DataSheet>
      </section>

      {/* 트리 확장 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">트리 확장</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          getChildren으로 트리 구조를 정의합니다. 캐럿 아이콘으로 펼침/접기, 세로선 가이드로 깊이를
          표현합니다.
        </p>
        <DataSheet
          items={categories}
          persistKey="tree"
          getChildren={(item) => item.children}
          expandedItems={expanded()}
          onExpandedItemsChange={setExpanded}
        >
          <DataSheet.Column<Category> key="name" header="카테고리" class="px-2 py-1">
            {(ctx) => ctx.item.name}
          </DataSheet.Column>
          <DataSheet.Column<Category> key="count" header="상품 수" class="px-2 py-1 text-right">
            {(ctx) => <>{ctx.item.count.toLocaleString()}개</>}
          </DataSheet.Column>
        </DataSheet>
      </section>

      {/* 고정 컬럼 + 리사이징 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          고정 컬럼 + 리사이징
        </h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          fixed 컬럼은 스크롤 시 좌측에 고정됩니다. 헤더 우측 드래그로 너비 변경, 더블클릭으로
          초기화.
        </p>
        <div>
          <DataSheet items={users} persistKey="fixed-resize">
            <DataSheet.Column<User> key="name" header="이름" class="px-2 py-1 font-medium" fixed>
              {(ctx) => ctx.item.name}
            </DataSheet.Column>
            <DataSheet.Column<User> key="age" header="나이" class="px-2 py-1" fixed>
              {(ctx) => ctx.item.age}
            </DataSheet.Column>
            <DataSheet.Column<User> key="email" header="이메일" class="px-2 py-1">
              {(ctx) => ctx.item.email}
            </DataSheet.Column>
            <DataSheet.Column<User> key="salary" header="급여" class="px-2 py-1 text-right">
              {(ctx) => <>{ctx.item.salary.toLocaleString()}원</>}
            </DataSheet.Column>
          </DataSheet>
        </div>
      </section>

      {/* 인라인 편집 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">인라인 편집</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          inset 컴포넌트를 사용하여 셀 내에서 직접 편집합니다.
        </p>
        <DataSheet items={editUsers} persistKey="cell-edit">
          <DataSheet.Column<User> key="name" header="이름">
            {(ctx) => (
              <TextInput
                value={ctx.item.name}
                onValueChange={(v) => {
                  ctx.item.name = v;
                }}
                inset
              />
            )}
          </DataSheet.Column>
          <DataSheet.Column<User> key="age" header="나이">
            {(ctx) => (
              <NumberInput
                value={ctx.item.age}
                onValueChange={(v) => {
                  ctx.item.age = v;
                }}
                inset
              />
            )}
          </DataSheet.Column>
          <DataSheet.Column<User> key="birthDate" header="생년월일">
            {(ctx) => (
              <DatePicker
                value={ctx.item.birthDate}
                onValueChange={(v) => {
                  ctx.item.birthDate = v;
                }}
                inset
              />
            )}
          </DataSheet.Column>
          <DataSheet.Column<User> key="startTime" header="출근시간">
            {(ctx) => (
              <TimePicker
                value={ctx.item.startTime}
                onValueChange={(v) => {
                  ctx.item.startTime = v;
                }}
                inset
              />
            )}
          </DataSheet.Column>
          <DataSheet.Column<User> key="createdAt" header="생성일시">
            {(ctx) => (
              <DateTimePicker
                value={ctx.item.createdAt}
                onValueChange={(v) => {
                  ctx.item.createdAt = v;
                }}
                inset
              />
            )}
          </DataSheet.Column>
          <DataSheet.Column<User> key="memo" header="메모">
            {(ctx) => (
              <Textarea
                value={ctx.item.memo}
                onValueChange={(v) => {
                  ctx.item.memo = v;
                }}
                inset
              />
            )}
          </DataSheet.Column>
          <DataSheet.Column<User> key="department" header="부서">
            {(ctx) => (
              <Select
                value={ctx.item.department}
                onValueChange={(v) => {
                  ctx.item.department = v;
                }}
                items={departments}
                renderValue={(v) => <>{v}</>}
                inset
              />
            )}
          </DataSheet.Column>
          <DataSheet.Column<User> key="active" header="활성">
            {(ctx) => (
              <Checkbox
                value={ctx.item.active}
                onValueChange={(v) => {
                  ctx.item.active = v;
                }}
                inset
              />
            )}
          </DataSheet.Column>
          <DataSheet.Column<User> key="vip" header="VIP">
            {(ctx) => (
              <Radio
                value={ctx.item.vip}
                onValueChange={(v) => {
                  ctx.item.vip = v;
                }}
                inset
              />
            )}
          </DataSheet.Column>
        </DataSheet>
      </section>

      {/* 다중 선택 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">다중 선택</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          selectMode="multiple"로 체크박스 기반 다중 선택. Shift+Click으로 범위 선택.
        </p>
        <DataSheet
          items={users}
          persistKey="select-multi"
          selectMode="multiple"
          selectedItems={multiSelected()}
          onSelectedItemsChange={setMultiSelected}
        >
          <DataSheet.Column<User> key="name" header="이름" class="px-2 py-1">
            {(ctx) => ctx.item.name}
          </DataSheet.Column>
          <DataSheet.Column<User> key="age" header="나이" class="px-2 py-1">
            {(ctx) => ctx.item.age}
          </DataSheet.Column>
          <DataSheet.Column<User> key="email" header="이메일" class="px-2 py-1">
            {(ctx) => ctx.item.email}
          </DataSheet.Column>
        </DataSheet>
        <p class="mt-2 text-sm text-base-500">
          선택된 항목:{" "}
          {multiSelected()
            .map((u) => u.name)
            .join(", ") || "(없음)"}
        </p>
      </section>

      {/* 단일 선택 + autoSelect */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          단일 선택 + autoSelect
        </h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          selectMode="single"로 화살표 아이콘 기반 단일 선택. autoSelect="click"으로 행 클릭 시 자동
          선택.
        </p>
        <DataSheet
          items={users}
          persistKey="select-single"
          selectMode="single"
          selectedItems={singleSelected()}
          onSelectedItemsChange={setSingleSelected}
          autoSelect="click"
        >
          <DataSheet.Column<User> key="name" header="이름" class="px-2 py-1">
            {(ctx) => ctx.item.name}
          </DataSheet.Column>
          <DataSheet.Column<User> key="age" header="나이" class="px-2 py-1">
            {(ctx) => ctx.item.age}
          </DataSheet.Column>
          <DataSheet.Column<User> key="salary" header="급여" class="px-2 py-1 text-right">
            {(ctx) => <>{ctx.item.salary.toLocaleString()}원</>}
          </DataSheet.Column>
        </DataSheet>
        <p class="mt-2 text-sm text-base-500">
          선택된 항목:{" "}
          {singleSelected()
            .map((u) => u.name)
            .join(", ") || "(없음)"}
        </p>
      </section>

      {/* 선택 불가 항목 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">선택 불가 항목</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          isItemSelectable으로 특정 항목의 선택을 비활성화합니다. 비활성 사유가 tooltip으로
          표시됩니다.
        </p>
        <DataSheet
          items={users}
          persistKey="select-disabled"
          selectMode="multiple"
          selectedItems={disabledSelected()}
          onSelectedItemsChange={setDisabledSelected}
          isItemSelectable={(item) => (item.salary >= 4500 ? true : "급여 4,500 미만은 선택 불가")}
        >
          <DataSheet.Column<User> key="name" header="이름" class="px-2 py-1">
            {(ctx) => ctx.item.name}
          </DataSheet.Column>
          <DataSheet.Column<User> key="salary" header="급여" class="px-2 py-1 text-right">
            {(ctx) => <>{ctx.item.salary.toLocaleString()}원</>}
          </DataSheet.Column>
          <DataSheet.Column<User> key="email" header="이메일" class="px-2 py-1">
            {(ctx) => ctx.item.email}
          </DataSheet.Column>
        </DataSheet>
        <p class="mt-2 text-sm text-base-500">
          선택된 항목:{" "}
          {disabledSelected()
            .map((u) => u.name)
            .join(", ") || "(없음)"}
        </p>
      </section>

      {/* 드래그 재정렬 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">드래그 재정렬</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          onItemsReorder를 설정하면 드래그 핸들 컬럼이 자동 추가됩니다. 핸들을 잡고 드래그하여 행
          순서를 변경할 수 있습니다.
        </p>
        <DataSheet
          items={reorderItems()}
          persistKey="reorder"
          onItemsReorder={(event) => {
            const items = [...reorderItems()];
            const fromIndex = items.indexOf(event.item);
            if (fromIndex < 0) return;

            const [moved] = items.splice(fromIndex, 1);
            let toIndex = items.indexOf(event.targetItem);
            if (toIndex < 0) return;

            if (event.position === "after") toIndex++;
            items.splice(toIndex, 0, moved);
            setReorderItems(items);
          }}
        >
          <DataSheet.Column<User> key="name" header="이름" class="px-2 py-1">
            {(ctx) => ctx.item.name}
          </DataSheet.Column>
          <DataSheet.Column<User> key="age" header="나이" class="px-2 py-1">
            {(ctx) => ctx.item.age}
          </DataSheet.Column>
          <DataSheet.Column<User> key="email" header="이메일" class="px-2 py-1">
            {(ctx) => ctx.item.email}
          </DataSheet.Column>
        </DataSheet>
      </section>
    </div>
  );
}
