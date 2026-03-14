# 레이아웃 & 데이터

## FormGroup

폼 필드를 레이블과 함께 배치하는 레이아웃.

```tsx
import { FormGroup } from "@simplysm/solid";

<FormGroup>
  <FormGroup.Item label="이름">
    <TextInput value={name()} onValueChange={setName} />
  </FormGroup.Item>
  <FormGroup.Item label="이메일">
    <TextInput value={email()} onValueChange={setEmail} />
  </FormGroup.Item>
</FormGroup>

// 인라인 배치
<FormGroup inline>
  <FormGroup.Item label="시작일"><DatePicker ... /></FormGroup.Item>
  <FormGroup.Item label="종료일"><DatePicker ... /></FormGroup.Item>
</FormGroup>
```

| Prop | 타입 | 설명 |
|------|------|------|
| `inline` | `boolean` | 가로 배치 (기본: 세로) |

---

## FormTable

HTML 테이블 기반 폼 레이아웃. 라벨-값 쌍을 테이블 셀로 배치한다.

```tsx
import { FormTable } from "@simplysm/solid";

<FormTable>
  <FormTable.Row>
    <FormTable.Item label="이름">
      <TextInput value={name()} onValueChange={setName} />
    </FormTable.Item>
    <FormTable.Item label="이메일">
      <TextInput value={email()} onValueChange={setEmail} />
    </FormTable.Item>
  </FormTable.Row>
  <FormTable.Row>
    <FormTable.Item label="주소" colspan={3}>
      <TextInput value={addr()} onValueChange={setAddr} />
    </FormTable.Item>
  </FormTable.Row>
</FormTable>
```

| 서브 컴포넌트 | 설명 |
|-------------|------|
| `FormTable.Row` | 테이블 행 |
| `FormTable.Item` | 테이블 셀. `label` prop으로 라벨을 `<th>`에, 내용을 `<td>`에 배치. `colspan`으로 열 병합 |

---

## Sidebar

네비게이션 사이드바. `AppMenu` 배열을 받아 트리 구조 메뉴를 렌더링한다.

```tsx
import { Sidebar, useSidebar } from "@simplysm/solid";
import type { AppMenu } from "@simplysm/solid";

const menus: AppMenu[] = [
  { title: "대시보드", href: "/dashboard", icon: IconDashboard },
  {
    title: "사용자 관리",
    icon: IconUsers,
    children: [
      { title: "사용자 목록", href: "/users" },
      { title: "역할 관리", href: "/roles" },
    ],
  },
];

<Sidebar.Container>
  <Sidebar menus={menus} homeHref="/" logoText="My App" />
  <Sidebar.Content>
    <main>{/* 페이지 콘텐츠 */}</main>
  </Sidebar.Content>
</Sidebar.Container>

// 토글 제어
const sidebar = useSidebar();
sidebar.setToggle(true);  // 열기/닫기 토글
```

토글 동작:
- `toggle=false` (기본): 데스크탑(640px+)에서 열림, 모바일(640px-)에서 닫힘
- `toggle=true`: 데스크탑에서 닫힘, 모바일에서 오버레이로 열림

---

## Topbar

상단 앱 바. 뒤로가기, 브레드크럼, 액션 버튼 등을 표시한다.

```tsx
import { Topbar, useTopbarActions } from "@simplysm/solid";

<Topbar.Container>
  <Topbar titleChain={["사용자 관리", "사용자 목록"]} />
  <div>{/* 페이지 콘텐츠 */}</div>
</Topbar.Container>

// 페이지별 커스텀 액션 (Topbar.Container 내부에서 사용)
useTopbarActions(() => (
  <>
    <Button onClick={save}>저장</Button>
    <Button onClick={refresh}>새로고침</Button>
  </>
));
```

CrudSheet/CrudDetail이 Topbar 내부에 배치되면 자동으로 Page 모드로 동작하며, Topbar에 저장/삭제/새로고침 버튼을 주입한다.

---

## Table

기본 HTML 테이블 래퍼.

```tsx
import { Table } from "@simplysm/solid";

<Table inset>
  <thead>
    <tr>
      <Table.HeaderCell>이름</Table.HeaderCell>
      <Table.HeaderCell>이메일</Table.HeaderCell>
    </tr>
  </thead>
  <tbody>
    <Table.Row>
      <Table.Cell>Alice</Table.Cell>
      <Table.Cell>alice@example.com</Table.Cell>
    </Table.Row>
  </tbody>
</Table>
```

---

## DataSheet

고급 데이터 테이블. 정렬, 페이징, 선택, 컬럼 리사이즈/리오더/고정, 셀 편집, 트리 확장, 요약행, 드래그 리오더, 설정 저장을 지원한다.

```tsx
import { DataSheet } from "@simplysm/solid";

<DataSheet items={users()}>
  <DataSheet.Column key="name" header="이름" sortable>
    {(ctx) => ctx.item.name}
  </DataSheet.Column>
  <DataSheet.Column key="email" header="이메일">
    {(ctx) => ctx.item.email}
  </DataSheet.Column>
  <DataSheet.Column key="score" header="점수" sortable>
    {(ctx) => ctx.item.score}
  </DataSheet.Column>
</DataSheet>
```

### DataSheet Props

| Prop | 타입 | 설명 |
|------|------|------|
| `items` | `TItem[]` | 데이터 배열 |
| `storageKey` | `string` | 컬럼 설정 localStorage 키 |
| `hideConfigBar` | `boolean` | 설정 바 숨기기 |
| `inset` | `boolean` | 테두리 없음 |
| `sorts` / `onSortsChange` | `SortingDef[]` | 정렬 상태 |
| `autoSort` | `boolean` | 클라이언트 자동 정렬 |
| `page` / `onPageChange` / `totalPageCount` / `pageSize` | | 페이징 |
| `selectionMode` | `"single" \| "multiple"` | 선택 모드 |
| `selection` / `onSelectionChange` | `TItem[]` | 선택 상태 |
| `isItemSelectable` | `(item: TItem) => boolean \| string` | 선택 가능 여부 (string은 비활성 사유 tooltip) |
| `expandedItems` / `onExpandedItemsChange` | `TItem[]` | 트리 확장 상태 |
| `itemChildren` | `(item, index) => TItem[] \| undefined` | 트리 자식 접근자 |
| `cellClass` / `cellStyle` | `(item, colKey) => string \| undefined` | 셀별 스타일링 |
| `onItemsReorder` | `(event: DataSheetReorderEvent) => void` | 행 드래그 리오더 |

### DataSheet.Column Props

| Prop | 타입 | 설명 |
|------|------|------|
| `key` | `string` | 컬럼 고유 키 |
| `header` | `string \| string[]` | 헤더 텍스트 (배열 시 다중 행 헤더, 동일 값은 셀 병합) |
| `headerContent` | `() => JSX.Element` | 커스텀 헤더 콘텐츠 |
| `summary` | `() => JSX.Element` | 요약행 콘텐츠 |
| `fixed` | `boolean` | 좌측 고정 |
| `hidden` | `boolean` | 숨김 |
| `collapse` | `boolean` | 축소 가능 |
| `width` | `string` | 너비 |
| `sortable` | `boolean` | 정렬 가능 |
| `resizable` | `boolean` | 리사이즈 가능 |
| `children` | `(ctx: DataSheetCellContext) => JSX.Element` | 셀 렌더링 |

### DataSheetCellContext

```typescript
interface DataSheetCellContext<TItem> {
  item: TItem;       // 현재 행 데이터
  index: number;     // 소속 배열 내 인덱스
  row: number;       // 플랫 표시 행 번호 (현재 페이지 내)
  depth: number;     // 트리 깊이
}
```

### 부가 기능

- `DataSheetConfigDialog` -- 컬럼 표시/순서/너비 설정 UI
- 설정 자동 저장 (localStorage)

---

## List

트리 뷰 스타일의 항목 목록. 키보드 내비게이션과 아코디언 동작을 지원한다.

```tsx
import { List } from "@simplysm/solid";

// 기본 사용
<List>
  <List.Item onClick={handleClick}>항목 1</List.Item>
  <List.Item selected>선택된 항목</List.Item>
  <List.Item disabled>비활성 항목</List.Item>
</List>

// 중첩 리스트 (아코디언)
<List>
  <List.Item>
    폴더
    <List.Item.Children>
      <List.Item>파일 1</List.Item>
      <List.Item>파일 2</List.Item>
    </List.Item.Children>
  </List.Item>
</List>

// 선택 아이콘
<List>
  <List.Item selectedIcon={IconCheck} selected>체크 표시</List.Item>
</List>
```

| Prop (List) | 타입 | 설명 |
|------------|------|------|
| `inset` | `boolean` | 테두리 없음 |

| Prop (List.Item) | 타입 | 설명 |
|-----------------|------|------|
| `selected` | `boolean` | 선택 상태 |
| `open` / `onOpenChange` | `boolean` | 제어 모드 열림/닫힘 |
| `disabled` | `boolean` | 비활성화 |
| `readOnly` | `boolean` | 읽기 전용 |
| `selectedIcon` | `Component<IconProps>` | 선택 시 표시할 아이콘 |
| `size` | `ComponentSize` | 크기 |
| `onClick` | `(e: MouseEvent) => void` | 클릭 핸들러 |

키보드 내비게이션:
- `Space` / `Enter`: 현재 항목 토글
- `ArrowUp` / `ArrowDown`: 이전/다음 항목으로 포커스 이동
- `ArrowRight`: 닫혀 있으면 열기, 열려 있으면 첫 자식으로 포커스
- `ArrowLeft`: 열려 있으면 닫기, 닫혀 있으면 부모로 포커스
- `Home` / `End`: 첫/마지막 항목으로 포커스

---

## Calendar

달력 위젯. 항목 데이터를 날짜별로 배치한다.

```tsx
import { Calendar } from "@simplysm/solid";

<Calendar
  items={events()}
  getItemDate={(event) => event.date}
  renderItem={(event) => <div>{event.title}</div>}
  yearMonth={yearMonth()}
  onYearMonthChange={setYearMonth}
/>
```

| Prop | 타입 | 설명 |
|------|------|------|
| `items` | `TValue[]` | 데이터 배열 |
| `getItemDate` | `(item, index) => DateOnly` | 항목에서 날짜 추출 |
| `renderItem` | `(item, index) => JSX.Element` | 항목 렌더링 |
| `yearMonth` / `onYearMonthChange` | `DateOnly` | 표시 년월 |
| `weekStartDay` | `number` | 주 시작 요일 (0=일요일, 기본: 0) |
| `minDaysInFirstWeek` | `number` | 첫 주 최소 일수 (기본: 1) |

---

## Kanban

칸반 보드. 레인/카드 구조의 드래그 앤 드롭을 지원한다.

```tsx
import { Kanban } from "@simplysm/solid";

<Kanban onDrop={(info) => handleDrop(info)}>
  <Kanban.Lane value="todo">
    <Kanban.LaneTitle><span>할 일</span></Kanban.LaneTitle>
    <Kanban.LaneTools><Button size="xs">+</Button></Kanban.LaneTools>
    <Kanban.Card value={1} draggable>
      <div>작업 1</div>
    </Kanban.Card>
    <Kanban.Card value={2} draggable>
      <div>작업 2</div>
    </Kanban.Card>
  </Kanban.Lane>
  <Kanban.Lane value="doing">
    <Kanban.LaneTitle><span>진행 중</span></Kanban.LaneTitle>
    <Kanban.Card value={3} draggable>
      <div>작업 3</div>
    </Kanban.Card>
  </Kanban.Lane>
</Kanban>
```

### Kanban Props

| Prop | 타입 | 설명 |
|------|------|------|
| `onDrop` | `(info: KanbanDropInfo) => void` | 드롭 이벤트 콜백 |
| `selectedValues` / `onSelectedValuesChange` | `TCardValue[]` | 선택된 카드 값 배열 |

### KanbanDropInfo

```typescript
interface KanbanDropInfo<TLaneValue, TCardValue> {
  sourceValue?: TCardValue;        // 드래그한 카드 값
  targetLaneValue?: TLaneValue;    // 드롭된 레인 값
  targetCardValue?: TCardValue;    // 드롭 위치의 카드 값
  position?: "before" | "after";   // 드롭 위치
}
```

### 서브 컴포넌트

| 컴포넌트 | 설명 |
|----------|------|
| `Kanban.Lane` | 칸반 레인. props: `value`, `busy`, `collapsible`, `collapsed`, `onCollapsedChange` |
| `Kanban.Card` | 칸반 카드. props: `value`, `draggable`, `selectable`, `contentClass` |
| `Kanban.LaneTitle` | 레인 타이틀 슬롯 |
| `Kanban.LaneTools` | 레인 도구 슬롯 |

카드 선택:
- `Shift+Click`: 다중 선택 토글
- 롱 프레스 (500ms): 해당 카드만 선택
- 레인 헤더 체크박스: 레인 내 전체 선택/해제

---

## Pagination

페이지 네비게이션.

```tsx
import { Pagination } from "@simplysm/solid";

<Pagination
  page={currentPage()}
  onPageChange={setCurrentPage}
  totalPageCount={totalPages()}
/>
```

| Prop | 타입 | 설명 |
|------|------|------|
| `page` | `number` | 현재 페이지 |
| `onPageChange` | `(page: number) => void` | 페이지 변경 콜백 |
| `totalPageCount` | `number` | 전체 페이지 수 |
| `displayPageCount` | `number` | 표시할 페이지 버튼 수 |
| `size` | `ComponentSize` | 크기 |
