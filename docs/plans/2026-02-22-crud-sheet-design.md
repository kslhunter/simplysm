# CrudSheet 컴포넌트 설계

## 목표

ERP CRUD 데이터 화면의 반복 boilerplate를 제거하는 Compound Component.
DataSheet 위에 CRUD 비즈니스 로직을 얹는 래퍼로, 기존 DataSheet를 내부에서 사용한다.

**설계 원칙:**
- 쉬운 기본 + 가능한 커스텀 (Pit of Success)
- Feature-grouped props (기능별 opt-in)
- 페이지/선택 모달 겸용 (dual-mode)

## API 개요

```tsx
<CrudSheet<Item, Filter>
  // 필수
  search={async (filter, page, sorts) => { ... }}
  getItemKey={(item) => item.id}

  // 설정
  persistKey="user-page"
  itemsPerPage={50}
  canEdit={() => perms().edit}

  // 기능 opt-in
  inlineEdit={{ submit, newItem, deleteProp }}
  modalEdit={{ editItem, deleteItems }}
  excel={{ download, upload }}
  selectMode="single" | "multi"
  onSelect={(result) => { ... }}

  // 커스터마이징
  hideAutoTools
>
  <CrudSheet.Filter initial={...}>{(filter, setFilter) => ...}</CrudSheet.Filter>
  <CrudSheet.Tools>{(ctx) => ...}</CrudSheet.Tools>
  <CrudSheet.Header>...</CrudSheet.Header>
  <CrudSheet.Column key="name" header="이름">{(ctx) => ...}</CrudSheet.Column>
</CrudSheet>
```

## 기능별 Props 설계

### 필수

| Prop | 타입 | 설명 |
|------|------|------|
| `search` | `(filter, page, sorts) => Promise<SearchResult<TItem>>` | 데이터 조회 |
| `getItemKey` | `(item) => string \| number \| undefined` | 아이템 고유키 (diff, selection 기준) |

### 설정

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `persistKey` | `string` | - | DataSheet 컬럼 설정 localStorage 키 |
| `itemsPerPage` | `number` | - | 주면 페이징 활성화, 안 주면 전체 조회 |
| `canEdit` | `() => boolean` | `() => true` | 편집 권한 (toolbar, 삭제 컬럼 표시 제어) |

### 기능: 인라인 편집 (`inlineEdit`)

제공하면 저장/행추가 버튼 자동 생성, diff 추적 활성화.

```typescript
interface InlineEditConfig<TItem> {
  submit: (diffs: ItemDiff<TItem>[]) => Promise<void>;
  newItem: () => TItem;
  deleteProp?: keyof TItem & string;  // 예: "isDeleted"
}
```

- `submit`: diff 배열을 받아 서버에 저장
- `newItem`: 행 추가 시 빈 아이템 생성
- `deleteProp`: 소프트 삭제 플래그 프로퍼티. 주면 삭제/복구 컬럼 자동 생성 + line-through 스타일

### 기능: 모달 편집 (`modalEdit`)

제공하면 등록/수정/삭제 버튼 자동 생성.

```typescript
interface ModalEditConfig<TItem> {
  editItem: (item?: TItem) => Promise<boolean>;  // true면 refresh
  deleteItems?: (items: TItem[]) => Promise<boolean>;
}
```

- `editItem`: 모달을 열어 편집. item 없으면 신규 등록
- `deleteItems`: 선택 항목 삭제

### 기능: 엑셀 (`excel`)

제공하면 엑셀 버튼 자동 생성.

```typescript
interface ExcelConfig<TItem> {
  download: (items: TItem[]) => Promise<void>;
  upload?: (file: File) => Promise<void>;
}
```

- `download`: 전체 데이터(페이징 무시) 조회 후 호출
- `upload`: 주면 엑셀 업로드 버튼 추가

### 기능: 선택 모드 (`selectMode`)

```typescript
selectMode?: "single" | "multi";
onSelect?: (result: SelectResult<TItem>) => void;
```

- 활성화 시: 편집 toolbar 숨김, 선택 UI 표시
- single: 행 클릭 즉시 onSelect 호출
- multi: 확인 버튼 클릭 시 onSelect 호출

## 내부 동작 흐름

```
1. 초기화
   filter ← CrudSheet.Filter의 initial로 createStore 생성
   lastFilter ← filter의 clone
   page ← 1, sorts ← []

2. 자동 조회 (createEffect)
   lastFilter / page / sorts 변경 감지:
   → busy ON
   → search(lastFilter, page, sorts) 호출
   → items에 reconcile, originalItems에 objClone (snapshot)
   → busy OFF, ready = true

3. 사용자 조작
   필터 조회 → lastFilter에 filter 복사, page 1로 리셋
   새로고침   → lastFilter 재설정 (effect 재실행)
   행 추가    → items 앞에 newItem() 삽입
   삭제 토글  → item[deleteProp] flip (id 없으면 배열에서 제거)

4. 저장 (Ctrl+S)
   → items vs originalItems diff 계산
   → diff 없으면 알림
   → diff 있으면 submit(diffs) → 성공 시 자동 refresh
```

## Cell Context

```typescript
interface CrudSheetCellContext<TItem> {
  item: TItem;
  index: number;
  row: number;
  depth: number;
  setItem: <TKey extends keyof TItem>(key: TKey, value: TItem[TKey]) => void;
}
```

`ctx.setItem("name", v)` → 내부적으로 `setItems(index, "name", v)`

## 커스터마이징

| 수준 | 방법 |
|------|------|
| 자동 버튼 옆에 추가 | `<CrudSheet.Tools>{(ctx) => ...}</CrudSheet.Tools>` |
| 자동 버튼 완전 교체 | `hideAutoTools` + `<CrudSheet.Tools>` |
| Filter 위에 영역 추가 | `<CrudSheet.Header>...</CrudSheet.Header>` |
| 내부 상태/액션 접근 | `ctx` (render props) |

### ctx에서 접근 가능한 것들

```typescript
interface CrudSheetContext<TItem> {
  items(): TItem[];
  selectedItems(): TItem[];
  page(): number;
  sorts(): SortingDef[];
  busy(): boolean;
  hasChanges(): boolean;

  save(): Promise<void>;
  refresh(): Promise<void>;
  addItem(): void;
  setPage(page: number): void;
  setSorts(sorts: SortingDef[]): void;
}
```

## 선택 모드 동작

| 영역 | 일반 모드 | 선택 모드 |
|------|-----------|-----------|
| Toolbar | 저장/행추가/삭제/엑셀 버튼 | 숨김 |
| Topbar 액션 | 저장/새로고침 | 새로고침만 |
| DataSheet selectMode | 없음 | single / multiple |
| 하단 영역 | 없음 | 선택 해제 / 확인 버튼 |
| Ctrl+S | 활성 | 비활성 |
| inlineEdit / excel | 동작 | 무시 |

## 컴포넌트 구조

```
CrudSheet
  └── BusyContainer
       ├── CrudSheet.Header (선택적)
       ├── Filter form (조회 버튼 포함)
       ├── Toolbar (자동 버튼 + CrudSheet.Tools)
       └── DataSheet
            ├── 삭제 컬럼 (deleteProp 기반, 자동)
            ├── CrudSheet.Column → DataSheet.Column (매핑)
            └── Pagination, Sorting, Selection
```

## 타입 정의

```typescript
interface CrudSheetProps<TItem, TFilter extends Record<string, any>> {
  search: (filter: TFilter, page: number, sorts: SortingDef[]) => Promise<SearchResult<TItem>>;
  getItemKey: (item: TItem) => string | number | undefined;

  persistKey?: string;
  itemsPerPage?: number;
  canEdit?: () => boolean;

  inlineEdit?: InlineEditConfig<TItem>;
  modalEdit?: ModalEditConfig<TItem>;
  excel?: ExcelConfig<TItem>;
  selectMode?: "single" | "multi";
  onSelect?: (result: SelectResult<TItem>) => void;

  hideAutoTools?: boolean;
  class?: string;
  children: JSX.Element;
}

interface InlineEditConfig<TItem> {
  submit: (diffs: ItemDiff<TItem>[]) => Promise<void>;
  newItem: () => TItem;
  deleteProp?: keyof TItem & string;
}

interface ModalEditConfig<TItem> {
  editItem: (item?: TItem) => Promise<boolean>;
  deleteItems?: (items: TItem[]) => Promise<boolean>;
}

interface ExcelConfig<TItem> {
  download: (items: TItem[]) => Promise<void>;
  upload?: (file: File) => Promise<void>;
}

interface SearchResult<TItem> {
  items: TItem[];
  pageCount?: number;
}

interface ItemDiff<TItem> {
  type: "insert" | "update" | "delete";
  item: TItem;
}

interface SelectResult<TItem> {
  items: TItem[];
  keys: (string | number)[];
}

interface CrudSheetCellContext<TItem> {
  item: TItem;
  index: number;
  row: number;
  depth: number;
  setItem: <TKey extends keyof TItem>(key: TKey, value: TItem[TKey]) => void;
}

interface CrudSheetContext<TItem> {
  items(): TItem[];
  selectedItems(): TItem[];
  page(): number;
  sorts(): SortingDef[];
  busy(): boolean;
  hasChanges(): boolean;
  save(): Promise<void>;
  refresh(): Promise<void>;
  addItem(): void;
  setPage(page: number): void;
  setSorts(sorts: SortingDef[]): void;
}
```

## 파일 배치

```
packages/solid/src/components/data/crud-sheet/
  ├── CrudSheet.tsx
  ├── CrudSheetColumn.tsx
  ├── CrudSheetFilter.tsx
  ├── CrudSheetTools.tsx
  ├── CrudSheetHeader.tsx
  └── types.ts
```

## 예상 효과

UserPage.tsx 기준: **640줄 → ~150줄** (약 75% 감소)
- 제거: 상태 관리, 이벤트 핸들러, 키보드 단축키, topbar, BusyContainer, filter form, toolbar
- 잔존: 권한 계산, search/submit 로직, 엑셀 로직, filter/column 정의
