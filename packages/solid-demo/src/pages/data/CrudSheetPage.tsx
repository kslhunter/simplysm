import { CrudSheet, FormGroup, TextInput, Checkbox, NumberInput } from "@simplysm/solid";

interface DemoItem {
  id?: number;
  name: string;
  age: number;
  email: string;
  isDeleted: boolean;
}

interface DemoFilter {
  searchText?: string;
  isIncludeDeleted: boolean;
}

let nextId = 4;
let mockData: DemoItem[] = [
  { id: 1, name: "홍길동", age: 30, email: "hong@test.com", isDeleted: false },
  { id: 2, name: "김철수", age: 25, email: "kim@test.com", isDeleted: false },
  { id: 3, name: "이영희", age: 28, email: "lee@test.com", isDeleted: false },
];

export function CrudSheetPage() {
  return (
    <CrudSheet<DemoItem, DemoFilter>
      search={(filter, _page, _sorts) => {
        let items = [...mockData];
        if (filter.searchText) {
          items = items.filter((i) => i.name.includes(filter.searchText!));
        }
        if (!filter.isIncludeDeleted) {
          items = items.filter((i) => !i.isDeleted);
        }
        return Promise.resolve({ items });
      }}
      getItemKey={(item) => item.id}
      filterInitial={{ isIncludeDeleted: false }}
      inlineEdit={{
        submit: (diffs) => {
          for (const diff of diffs) {
            if (diff.type === "create") {
              diff.item.id = nextId++;
              mockData.push(diff.item);
            } else if (diff.type === "update") {
              const idx = mockData.findIndex((i) => i.id === diff.item.id);
              if (idx >= 0) mockData[idx] = diff.item;
            }
          }
          return Promise.resolve();
        },
        newItem: () => ({ name: "", age: 0, email: "", isDeleted: false }),
        deleteProp: "isDeleted",
      }}
      persistKey="crud-sheet-demo"
    >
      <CrudSheet.Filter<DemoFilter>>
        {(filter, setFilter) => (
          <>
            <FormGroup.Item label="검색어">
              <TextInput
                value={filter.searchText ?? ""}
                onValueChange={(v) => setFilter("searchText", v)}
              />
            </FormGroup.Item>
            <FormGroup.Item>
              <Checkbox
                value={filter.isIncludeDeleted}
                onValueChange={(v) => setFilter("isIncludeDeleted", v)}
              >
                삭제항목 포함
              </Checkbox>
            </FormGroup.Item>
          </>
        )}
      </CrudSheet.Filter>

      <CrudSheet.Column<DemoItem> key="id" header="#" fixed sortable={false}>
        {(ctx) => <div class="px-2 py-1 text-right">{ctx.item.id}</div>}
      </CrudSheet.Column>

      <CrudSheet.Column<DemoItem> key="name" header="이름">
        {(ctx) => (
          <TextInput
            inset
            size="sm"
            required
            value={ctx.item.name}
            onValueChange={(v) => ctx.setItem("name", v)}
          />
        )}
      </CrudSheet.Column>

      <CrudSheet.Column<DemoItem> key="age" header="나이">
        {(ctx) => (
          <NumberInput
            inset
            size="sm"
            value={ctx.item.age}
            onValueChange={(v) => ctx.setItem("age", v ?? 0)}
          />
        )}
      </CrudSheet.Column>

      <CrudSheet.Column<DemoItem> key="email" header="이메일">
        {(ctx) => (
          <TextInput
            inset
            size="sm"
            type="email"
            value={ctx.item.email}
            onValueChange={(v) => ctx.setItem("email", v)}
          />
        )}
      </CrudSheet.Column>
    </CrudSheet>
  );
}

export default CrudSheetPage;
