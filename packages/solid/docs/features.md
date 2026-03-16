# 기능 컴포넌트

엔터프라이즈 비즈니스 로직을 캡슐화한 고수준 컴포넌트.

## CRUD 컴포넌트 동작 모드

`CrudSheet`과 `CrudDetail`은 겸용 컴포넌트로, `close` prop 전달 여부와 `Topbar` 컨텍스트에 따라 3가지 모드로 동작한다. CRUD 기반 컴포넌트를 만들 때는 관례적으로 `close` prop을 받아 그대로 전달한다.

| 모드 | 조건 | 툴바 위치 | 저장 후 동작 |
|------|------|-----------|-------------|
| **Dialog** | `close` 전달됨 | Dialog 헤더에 refresh, 하단에 저장/삭제 액션바 | `close(true)`로 다이얼로그 닫기 |
| **Page** | `close` 미전달 + `Topbar` 내부 | `Topbar`에 저장/삭제/새로고침 버튼 주입 | 데이터 재조회 |
| **Control** | `close` 미전달 + `Topbar` 외부 | 자체 인라인 툴바 표시 | 데이터 재조회 |

```tsx
// CRUD 기반 컴포넌트는 close prop을 받아 그대로 전달하는 것이 관례
function UserList(props: { close?: (result?: boolean) => void }) {
  return (
    <CrudSheet close={props.close} search={...} getItemKey={...} inlineEdit={...}>
      ...
    </CrudSheet>
  );
}

// Dialog 모드 -- close가 전달되어 모달로 동작
const result = await dialog.open(UserList);

// Page 모드 -- Topbar 하위 라우트에 배치, close 미전달
<Route path="/users" component={UserList} />

// Control 모드 -- 다른 페이지의 일부로 임베드, close 미전달
<div class="grid grid-cols-2">
  <UserList />
  <OrderList />
</div>
```

---

## CrudSheet

DataSheet 기반 CRUD 기능 통합 컴포넌트. 인라인/다이얼로그 편집, 검색, Excel 가져오기/내보내기, 선택 모드, 배치 작업을 지원한다.

편집 방식은 `inlineEdit`과 `dialogEdit` 중 하나를 선택한다 (동시 사용 불가).

- **inlineEdit**: 셀 직접 편집, 행 추가/삭제, diff 기반 일괄 저장
- **dialogEdit**: 행 클릭 시 다이얼로그로 편집, 선택 항목 일괄 삭제/복원

```tsx
import { CrudSheet } from "@simplysm/solid";

// 인라인 편집
function UserSheet(props: { close?: (result?: boolean) => void }) {
  return (
    <CrudSheet
      close={props.close}
      search={(filter, page, sorts) => fetchUsers(filter, page, sorts)}
      getItemKey={(item) => item.id}
      inlineEdit={{
        submit: (diffs) => saveUsers(diffs),
        newItem: () => ({ id: undefined, name: "", email: "" }),
        deleteProp: "isDeleted",
      }}
    >
      <CrudSheet.Column header="이름" key="name">
        {(ctx) => <TextInput value={ctx.item.name} onValueChange={(v) => ctx.setItem("name", v)} />}
      </CrudSheet.Column>
    </CrudSheet>
  );
}

// 다이얼로그 편집
function ProductSheet(props: { close?: (result?: boolean) => void }) {
  const dialog = useDialog();
  return (
    <CrudSheet
      close={props.close}
      search={(filter, page, sorts) => fetchProducts(filter, page, sorts)}
      getItemKey={(item) => item.id}
      dialogEdit={{
        editItem: (item) => dialog.open(ProductDetail, { item }),
        deleteItems: (items) => deleteProducts(items),
        restoreItems: (items) => restoreProducts(items),
      }}
    >
      <CrudSheet.Column header="상품명" key="name" editTrigger>
        {(ctx) => ctx.item.name}
      </CrudSheet.Column>
    </CrudSheet>
  );
}
```

### CrudSheet Props

| Prop | 타입 | 설명 |
|------|------|------|
| `search` | `(filter, page, sorts) => Promise<SearchResult<TItem>>` | 데이터 조회 함수. `page`가 `undefined`면 전체 조회 (Excel 등) |
| `getItemKey` | `(item: TItem) => string \| number \| undefined` | 아이템 고유 키 반환 |
| `close` | `() => void` | Dialog 모드 활성화. 전달 시 Dialog 헤더에 새로고침 버튼 표시 |
| `inlineEdit` | `InlineEditConfig<TItem>` | 인라인 편집 설정 (`dialogEdit`과 동시 사용 불가) |
| `dialogEdit` | `DialogEditConfig<TItem>` | 다이얼로그 편집 설정 (`inlineEdit`과 동시 사용 불가) |
| `editable` | `boolean` | 편집 버튼 표시 여부 (기본값: `true`) |
| `isItemEditable` | `(item: TItem) => boolean` | 아이템별 편집 가능 여부 (dialogEdit의 editTrigger 링크에 적용) |
| `isItemDeletable` | `(item: TItem) => boolean` | 아이템별 삭제 가능 여부 (삭제 버튼/링크 비활성화) |
| `isItemDeleted` | `(item: TItem) => boolean` | 아이템 삭제 상태 확인 (취소선 표시) |
| `isItemSelectable` | `(item: TItem) => boolean \| string` | 아이템별 선택 가능 여부 |
| `filterInitial` | `TFilter` | 필터 초기값 |
| `items` | `TItem[]` | 제어 모드: 외부에서 아이템 배열 전달 |
| `onItemsChange` | `(items: TItem[]) => void` | 제어 모드: 아이템 변경 콜백 |
| `storageKey` | `string` | DataSheet 컬럼 너비 등 상태 저장 키 |
| `lastModifiedAtProp` | `string` | 자동 "최종수정일시" 컬럼 추가 (DateTime 타입, hidden) |
| `lastModifiedByProp` | `string` | 자동 "수정자" 컬럼 추가 (string 타입, hidden) |
| `excel` | `ExcelConfig<TItem>` | Excel 가져오기/내보내기 설정 |
| `selectionMode` | `"single" \| "multiple"` | 선택 모드 활성화 |
| `selectedKeys` | `(string \| number)[]` | 제어 모드: 선택된 키 배열 |
| `onSelectedKeysChange` | `(keys) => void` | 제어 모드: 선택 변경 콜백 |
| `onSelect` | `(result: SelectResult<TItem>) => void` | 선택 확인 콜백 (single 모드는 클릭 시 자동 호출) |
| `onSubmitComplete` | `() => void` | 저장 완료 후 콜백 |
| `hideAutoTools` | `boolean` | 자동 생성 툴바 버튼 숨기기 |
| `class` | `string` | CSS 클래스 |

### 설정 타입

```typescript
// 인라인 편집 설정
interface InlineEditConfig<TItem> {
  submit: (diffs: ArrayOneWayDiffResult<TItem>[]) => Promise<void>;
  newItem: () => TItem;
  deleteProp?: keyof TItem & string;   // 삭제 플래그 프로퍼티 (예: "isDeleted")
  diffsExcludes?: string[];            // diff 비교 제외 프로퍼티
}

// 다이얼로그 편집 설정
interface DialogEditConfig<TItem> {
  editItem: (item?: TItem) => Promise<boolean | undefined>;   // 등록(item 없음)/수정 다이얼로그
  deleteItems?: (items: TItem[]) => Promise<boolean>;          // 선택 항목 삭제
  restoreItems?: (items: TItem[]) => Promise<boolean>;         // 선택 항목 복원
}

// Excel 설정
interface ExcelConfig<TItem> {
  download: (items: TItem[]) => Promise<void>;   // 전체 데이터 다운로드
  upload?: (file: File) => Promise<void>;        // .xlsx 파일 업로드
}

// 조회 결과
interface SearchResult<TItem> {
  items: TItem[];
  pageCount?: number;   // 페이지 수 (미설정 시 페이징 없음)
}

// 선택 결과
interface SelectResult<TItem> {
  items: TItem[];
  keys: (string | number)[];
}
```

### 선택 모드

`selectionMode`를 설정하면 체크박스 컬럼이 자동 추가된다. Dialog 모드에서 사용하면 선택 전용 UI로 전환된다.

```tsx
// 다중 선택 (제어 모드)
const [selectedKeys, setSelectedKeys] = createSignal<number[]>([]);

<CrudSheet
  search={searchFn}
  getItemKey={(item) => item.id}
  selectionMode="multiple"
  selectedKeys={selectedKeys()}
  onSelectedKeysChange={setSelectedKeys}
>
  <CrudSheet.Column key="name" header="이름">
    {(ctx) => <div>{ctx.item.name}</div>}
  </CrudSheet.Column>
</CrudSheet>

// Dialog에서 단일 선택 (클릭 시 자동 확정)
<CrudSheet
  close={props.close}
  search={searchFn}
  getItemKey={(item) => item.id}
  selectionMode="single"
  onSelect={(result) => props.close?.({ selectedKeys: result.keys })}
>
  ...
</CrudSheet>
```

### Excel 가져오기/내보내기

```tsx
<CrudSheet
  search={searchFn}
  getItemKey={(item) => item.id}
  excel={{
    download: async (items) => {
      // items는 전체 데이터 (페이징 무시하고 재조회)
      await exportToExcel(items);
    },
    upload: async (file) => {
      // .xlsx 파일 업로드 후 자동 새로고침
      await importFromExcel(file);
    },
  }}
>
  ...
</CrudSheet>
```

### 키보드 단축키

| 단축키 | 동작 |
|--------|------|
| `Ctrl+S` | 저장 (인라인 편집 모드) |
| `Ctrl+Alt+L` | 새로고침 |

활성화 조건: 해당 CrudSheet 영역에 포커스/클릭이 있어야 한다 (다중 CrudSheet 환경에서 충돌 방지).

### CrudSheet 서브 컴포넌트

| 컴포넌트 | 설명 |
|----------|------|
| `CrudSheet.Column` | 컬럼 정의. `editTrigger`로 dialogEdit 시 클릭 편집 링크 표시 |
| `CrudSheet.Filter` | 검색 필터 영역. render prop으로 `(filter, setFilter)` 전달 |
| `CrudSheet.Tools` | 커스텀 툴바 버튼. render prop으로 `CrudSheetContext` 전달 |
| `CrudSheet.Header` | 시트 상단 커스텀 헤더 영역 |

### CrudSheet.Column

`DataSheetColumn`의 모든 props를 상속하며, 추가로 `editTrigger`와 CRUD 전용 셀 컨텍스트를 제공한다.

```tsx
<CrudSheet.Column<TItem>
  key="name"              // 컬럼 식별 키 (정렬, 저장에 사용)
  header="이름"           // 헤더 텍스트 또는 JSX
  editTrigger             // dialogEdit 시 클릭 편집 링크 표시
  fixed                   // 고정 컬럼
  hidden                  // 기본 숨김 (사용자가 토글 가능)
  collapse                // 접기 가능
  width="150px"           // 초기 너비
  sortable={true}         // 정렬 가능 (기본: true)
  resizable={true}        // 리사이즈 가능 (기본: true)
  summary={(items) => items.reduce((sum, item) => sum + item.amount, 0)}
>
  {(ctx) => (
    // ctx: CrudSheetCellContext<TItem>
    // ctx.item: 현재 아이템
    // ctx.index: 배열 인덱스
    // ctx.row: 행 번호
    // ctx.depth: 트리 깊이
    // ctx.setItem(key, value): 인라인 편집 시 값 변경
    <TextInput value={ctx.item.name} onValueChange={(v) => ctx.setItem("name", v)} />
  )}
</CrudSheet.Column>
```

### CrudSheet.Filter

검색 필터 영역. render prop으로 현재 `filter` 상태와 `setFilter` (SolidJS store setter)를 전달한다. 검색 버튼은 자동 생성된다.

```tsx
<CrudSheet.Filter<{ searchText?: string; status?: string }>>
  {(filter, setFilter) => (
    <>
      <FormGroup.Item label="검색어">
        <TextInput value={filter.searchText ?? ""} onValueChange={(v) => setFilter("searchText", v)} />
      </FormGroup.Item>
      <FormGroup.Item label="상태">
        <Select
          value={filter.status}
          onValueChange={(v) => setFilter("status", v)}
          items={["active", "inactive"]}
        />
      </FormGroup.Item>
    </>
  )}
</CrudSheet.Filter>
```

### CrudSheet.Tools

커스텀 툴바 버튼. render prop으로 `CrudSheetContext`를 전달하여 내부 상태 접근 및 액션 호출이 가능하다.

```tsx
<CrudSheet.Tools<TItem>>
  {(ctx) => (
    <>
      <Button size="sm" onClick={() => void handleCustomAction(ctx.selection())}>
        커스텀 액션 ({ctx.selection().length}건)
      </Button>
      <Show when={ctx.hasChanges()}>
        <span class="text-warning-500">변경사항 있음</span>
      </Show>
    </>
  )}
</CrudSheet.Tools>
```

#### CrudSheetContext API

| 멤버 | 타입 | 설명 |
|------|------|------|
| `items()` | `TItem[]` | 현재 페이지 아이템 목록 |
| `selection()` | `TItem[]` | 현재 선택된 아이템 목록 |
| `page()` | `number` | 현재 페이지 번호 |
| `sorts()` | `SortingDef[]` | 현재 정렬 정의 |
| `busy()` | `boolean` | 로딩 중 여부 |
| `hasChanges()` | `boolean` | 변경사항 존재 여부 (인라인 편집) |
| `save()` | `Promise<void>` | 저장 실행 |
| `refresh()` | `Promise<void>` | 데이터 새로고침 |
| `addItem()` | `void` | 행 추가 (인라인 편집) |
| `clearSelection()` | `void` | 선택 초기화 |
| `setPage(page)` | `void` | 페이지 변경 |
| `setSorts(sorts)` | `void` | 정렬 변경 |

### CrudSheet.Header

시트 상단에 커스텀 헤더 영역을 추가한다.

```tsx
<CrudSheet.Header>
  <div class="p-2 text-lg font-bold">사용자 관리</div>
</CrudSheet.Header>
```

---

## CrudDetail

단건 레코드 편집 폼. 저장/삭제/복원, 변경사항 자동 추적을 지원한다.

```tsx
import { CrudDetail } from "@simplysm/solid";

function UserDetail(props: { close?: (result?: boolean) => void; userId: number }) {
  return (
    <CrudDetail
      close={props.close}
      load={() => fetchUser(props.userId)}
      submit={(data) => saveUser(data)}
      toggleDelete={(del) => toggleDeleteUser(props.userId, del)}
    >
      {(ctx) => (
        <FormGroup>
          <FormGroup.Item label="이름">
            <TextInput value={ctx.data.name} onValueChange={(v) => ctx.setData("name", v)} />
          </FormGroup.Item>
        </FormGroup>
      )}
    </CrudDetail>
  );
}

// Dialog로 열기
const result = await dialog.open(UserDetail, { userId: 123 });
```

### CrudDetail 서브 컴포넌트

| 컴포넌트 | 설명 |
|----------|------|
| `CrudDetail.Tools` | 커스텀 툴바 버튼 |
| `CrudDetail.Before` | 폼 위쪽 영역 (폼 외부) |
| `CrudDetail.After` | 폼 아래쪽 영역 (폼 외부) |

---

## DataSelectButton

다이얼로그 기반 데이터 선택 버튼. 선택 다이얼로그를 열어 항목을 선택하고, 선택된 항목을 표시한다.

```tsx
import { DataSelectButton, type SelectDialogBaseProps } from "@simplysm/solid";

// 선택 다이얼로그 컴포넌트 정의
function UserSelectDialog(props: SelectDialogBaseProps & { department?: string }) {
  // props.selectionMode: "single" | "multiple"
  // props.selectedKeys: 기존 선택된 키 배열
  // props.close: 결과 반환 함수

  const handleSelect = (userIds: number[]) => {
    props.close?.({ selectedKeys: userIds });
  };

  return <div>...</div>;
}

// 단일 선택
<DataSelectButton
  value={selectedUserId()}
  onValueChange={setSelectedUserId}
  load={async (keys) => await loadUsers(keys)}
  renderItem={(user) => <span>{user.name}</span>}
  dialog={UserSelectDialog}
  dialogOptions={{ header: "사용자 선택", width: "600px" }}
/>

// 다중 선택
<DataSelectButton
  multiple
  value={selectedUserIds()}
  onValueChange={setSelectedUserIds}
  load={async (keys) => await loadUsers(keys)}
  renderItem={(user) => <span>{user.name}</span>}
  dialog={UserSelectDialog}
  dialogOptions={{ header: "사용자 선택" }}
/>

// 다이얼로그에 추가 props 전달
<DataSelectButton
  value={selectedUserId()}
  onValueChange={setSelectedUserId}
  load={loadUsers}
  renderItem={(user) => <span>{user.name}</span>}
  dialog={UserSelectDialog}
  dialogProps={{ department: "engineering" }}
/>
```

### SelectDialogBaseProps (선택 다이얼로그 필수 props)

```typescript
interface SelectDialogBaseProps<TKey = string | number> {
  close?: (result?: DataSelectDialogResult<TKey>) => void;
  selectionMode: "single" | "multiple";
  selectedKeys: TKey[];
}

interface DataSelectDialogResult<TKey> {
  selectedKeys: TKey[];
}
```

---

## SharedDataSelect

SharedData 기반 Select 드롭다운. SharedDataAccessor를 연결하면 자동으로 아이템 목록, 검색, 트리 구조를 지원한다.

```tsx
import { SharedDataSelect } from "@simplysm/solid";

const sharedData = useSharedData<{ users: User }>();

// 단일 선택
<SharedDataSelect
  data={sharedData.users}
  value={selectedUserId()}
  onValueChange={setSelectedUserId}
>
  <SharedDataSelect.ItemTemplate>
    {(item: User) => <span>{item.name}</span>}
  </SharedDataSelect.ItemTemplate>
</SharedDataSelect>

// 다중 선택
<SharedDataSelect
  multiple
  data={sharedData.users}
  value={selectedUserIds()}
  onValueChange={setSelectedUserIds}
>
  <SharedDataSelect.ItemTemplate>
    {(item: User) => <span>{item.name}</span>}
  </SharedDataSelect.ItemTemplate>
</SharedDataSelect>

// 다이얼로그 검색 연동
<SharedDataSelect
  data={sharedData.users}
  value={selectedUserId()}
  onValueChange={setSelectedUserId}
  dialog={UserSearchDialog}
  dialogOptions={{ header: "사용자 검색" }}
>
  <SharedDataSelect.ItemTemplate>
    {(item: User) => <span>{item.name}</span>}
  </SharedDataSelect.ItemTemplate>
  <SharedDataSelect.Action onClick={handleCustomAction}>
    <Icon icon={IconPlus} />
  </SharedDataSelect.Action>
</SharedDataSelect>

// 아이템 필터링
<SharedDataSelect
  data={sharedData.departments}
  value={deptId()}
  onValueChange={setDeptId}
  filterFn={(item) => item.isActive}
>
  <SharedDataSelect.ItemTemplate>
    {(item) => <span>{item.name}</span>}
  </SharedDataSelect.ItemTemplate>
</SharedDataSelect>
```

| Prop | 타입 | 설명 |
|------|------|------|
| `data` | `SharedDataAccessor<TItem>` | 공유 데이터 접근자 |
| `value` / `onValueChange` | `TKey \| TKey[]` | 선택된 키 값 |
| `multiple` | `boolean` | 다중 선택 모드 |
| `filterFn` | `(item, index) => boolean` | 아이템 필터 |
| `dialog` | `Component<TDialogProps>` | 검색 다이얼로그 컴포넌트 |
| `dialogOptions` | `DialogShowOptions` | 다이얼로그 옵션 |
| `required`, `disabled`, `size`, `inset` | | 공통 폼 컨트롤 props |

### 서브 컴포넌트

| 컴포넌트 | 설명 |
|----------|------|
| `SharedDataSelect.ItemTemplate` | 드롭다운 아이템 렌더링 커스터마이징 |
| `SharedDataSelect.Action` | 드롭다운 하단 커스텀 액션 버튼 |

---

## SharedDataSelectButton

SharedData 기반 DataSelectButton. SharedDataAccessor와 다이얼로그를 연결한다.

```tsx
import { SharedDataSelectButton } from "@simplysm/solid";

<SharedDataSelectButton
  data={sharedData.users}
  value={selectedUserId()}
  onValueChange={setSelectedUserId}
  dialog={UserSearchDialog}
  dialogOptions={{ header: "사용자 선택" }}
>
  {(user) => <span>{user.name}</span>}
</SharedDataSelectButton>

// 다중 선택
<SharedDataSelectButton
  multiple
  data={sharedData.users}
  value={selectedUserIds()}
  onValueChange={setSelectedUserIds}
  dialog={UserSearchDialog}
>
  {(user) => <span>{user.name}</span>}
</SharedDataSelectButton>
```

---

## SharedDataSelectList

SharedData 기반 목록 선택 UI. 검색, 필터, 페이징을 내장한다.

```tsx
import { SharedDataSelectList } from "@simplysm/solid";

<SharedDataSelectList
  data={sharedData.departments}
  value={selectedDept()}
  onValueChange={setSelectedDept}
  pageSize={20}
  header={<h3>부서 선택</h3>}
>
  <SharedDataSelectList.ItemTemplate>
    {(dept: Department) => <span>{dept.name}</span>}
  </SharedDataSelectList.ItemTemplate>
</SharedDataSelectList>

// 커스텀 필터 UI
<SharedDataSelectList data={sharedData.items} value={v()} onValueChange={setV}>
  <SharedDataSelectList.ItemTemplate>
    {(item) => <span>{item.name}</span>}
  </SharedDataSelectList.ItemTemplate>
  <SharedDataSelectList.Filter>
    <MyCustomFilter />
  </SharedDataSelectList.Filter>
</SharedDataSelectList>
```

| Prop | 타입 | 설명 |
|------|------|------|
| `data` | `SharedDataAccessor<TItem>` | 공유 데이터 접근자 |
| `value` / `onValueChange` | `TItem \| undefined` | 선택된 항목 (아이템 참조) |
| `filterFn` | `(item, index) => boolean` | 아이템 필터 |
| `canChange` | `(item) => boolean \| Promise<boolean>` | 변경 가드 |
| `pageSize` | `number` | 페이지 크기 (설정 시 페이지네이션 표시) |
| `header` | `JSX.Element` | 상단 헤더 |

---

## PermissionTable

`createAppStructure`에서 생성한 권한 트리를 DataSheet로 렌더링하는 권한 관리 테이블.

```tsx
import { PermissionTable } from "@simplysm/solid";

const app = useAppStructure();

<PermissionTable
  items={app.usablePerms()}
  value={permissions()}
  onValueChange={setPermissions}
  modules={activeModules()}
/>
```

| Prop | 타입 | 설명 |
|------|------|------|
| `items` | `AppPerm[]` | 권한 트리 (`createAppStructure`의 `usablePerms()`) |
| `value` | `Record<string, boolean>` | 권한 레코드 (`"href/perm": true`) |
| `onValueChange` | `(v: Record<string, boolean>) => void` | 변경 콜백 |
| `modules` | `TModule[]` | 활성 모듈 필터 |
| `disabled` | `boolean` | 비활성화 |

동작 규칙:
- 기본 권한(`perms[0]`, 보통 `"use"`)이 꺼지면 하위 권한도 자동으로 꺼진다
- 그룹 노드 체크 시 모든 자식에 대해 일괄 적용
- 모듈 필터링: `modules` prop에 따라 해당 모듈의 항목만 표시

---

## AddressSearch

다음(카카오) 우편번호 API 기반 주소 검색.

```tsx
import { AddressSearchContent, type AddressSearchResult } from "@simplysm/solid";

// Dialog로 사용
const dialog = useDialog();
const result = await dialog.show<AddressSearchResult>(AddressSearchContent, {}, {
  header: "주소 검색",
  width: "500px",
  height: "500px",
});

if (result) {
  setPostCode(result.postNumber);
  setAddress(result.address);
  setBuildingName(result.buildingName);
}
```

### AddressSearchResult

```typescript
interface AddressSearchResult {
  postNumber: string | undefined;    // 우편번호
  address: string | undefined;      // 주소
  buildingName: string | undefined;  // 건물명
}
```
