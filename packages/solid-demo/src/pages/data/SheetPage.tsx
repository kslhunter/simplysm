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

const departments = ["Sales", "Development", "HR", "Marketing"];

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
  { name: "John Doe", age: 30, email: "john@example.com", salary: 5000 },
  { name: "Jane Smith", age: 25, email: "jane@example.com", salary: 4200 },
  { name: "Bob Wilson", age: 28, email: "bob@example.com", salary: 4800 },
  { name: "Alice Johnson", age: 35, email: "alice@example.com", salary: 5500 },
  { name: "Charlie Brown", age: 22, email: "charlie@example.com", salary: 3800 },
];

interface Category {
  name: string;
  count: number;
  children?: Category[];
}

const categories: Category[] = [
  {
    name: "Electronics",
    count: 150,
    children: [
      {
        name: "Computers",
        count: 80,
        children: [
          { name: "Laptops", count: 45 },
          { name: "Desktops", count: 35 },
        ],
      },
      {
        name: "Mobile",
        count: 70,
        children: [
          { name: "Smartphones", count: 50 },
          { name: "Tablets", count: 20 },
        ],
      },
    ],
  },
  {
    name: "Clothing",
    count: 200,
    children: [
      { name: "Tops", count: 120 },
      { name: "Bottoms", count: 80 },
    ],
  },
  { name: "Food", count: 300 },
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
      name: "John Doe",
      age: 30,
      email: "john@example.com",
      salary: 5000,
      birthDate: new DateOnly(1994, 5, 15),
      startTime: new Time(9, 0, 0),
      createdAt: new DateTime(2024, 1, 15, 10, 30),
      memo: "Team Lead",
      department: "Development",
      active: true,
      vip: false,
    },
    {
      name: "Jane Smith",
      age: 25,
      email: "jane@example.com",
      salary: 4200,
      birthDate: new DateOnly(1999, 3, 20),
      startTime: new Time(10, 0, 0),
      createdAt: new DateTime(2024, 3, 1, 9, 0),
      memo: "Intern",
      department: "Sales",
      active: true,
      vip: false,
    },
    {
      name: "Bob Wilson",
      age: 28,
      email: "bob@example.com",
      salary: 4800,
      birthDate: new DateOnly(1996, 8, 10),
      startTime: new Time(9, 30, 0),
      createdAt: new DateTime(2024, 2, 10, 14, 15),
      memo: "Senior Staff",
      department: "HR",
      active: false,
      vip: true,
    },
    {
      name: "Alice Johnson",
      age: 35,
      email: "alice@example.com",
      salary: 5500,
      birthDate: new DateOnly(1989, 12, 1),
      startTime: new Time(8, 30, 0),
      createdAt: new DateTime(2023, 6, 5, 11, 0),
      memo: "Manager\n10 years experience",
      department: "Marketing",
      active: true,
      vip: true,
    },
    {
      name: "Charlie Brown",
      age: 22,
      email: "charlie@example.com",
      salary: 3800,
      birthDate: new DateOnly(2002, 1, 25),
      startTime: new Time(10, 30, 0),
      createdAt: new DateTime(2025, 1, 2, 8, 45),
      memo: "Intern",
      department: "Development",
      active: true,
      vip: false,
    },
  ]);

  return (
    <div class="space-y-8 p-6">
      {/* Basic table */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Basic Table</h2>
        <DataSheet items={users} persistKey="basic">
          <DataSheet.Column<User> key="name" header="Name" class="px-2 py-1">
            {(ctx) => ctx.item.name}
          </DataSheet.Column>
          <DataSheet.Column<User> key="age" header="Age" class="px-2 py-1">
            {(ctx) => ctx.item.age}
          </DataSheet.Column>
          <DataSheet.Column<User> key="email" header="Email" class="px-2 py-1">
            {(ctx) => ctx.item.email}
          </DataSheet.Column>
        </DataSheet>
      </section>

      {/* Multi-level header */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Multi-level Header</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Pass an array to the header prop to create multi-level headers. Same group names are automatically merged.
        </p>
        <DataSheet items={users} persistKey="multi-header">
          <DataSheet.Column<User> key="name" header={["Basic Info", "Name"]} class="px-2 py-1">
            {(ctx) => ctx.item.name}
          </DataSheet.Column>
          <DataSheet.Column<User> key="age" header={["Basic Info", "Age"]} class="px-2 py-1">
            {(ctx) => ctx.item.age}
          </DataSheet.Column>
          <DataSheet.Column<User> key="email" header={["Contact", "Email"]} class="px-2 py-1">
            {(ctx) => ctx.item.email}
          </DataSheet.Column>
          <DataSheet.Column<User> key="salary" header="Salary" class="px-2 py-1 text-right">
            {(ctx) => <>{ctx.item.salary.toLocaleString()}</>}
          </DataSheet.Column>
        </DataSheet>
      </section>

      {/* Summary row */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Summary Row</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Add a summary row using the summary prop. It is placed within thead and remains fixed at the top when scrolling.
        </p>
        <DataSheet items={users} persistKey="summary">
          <DataSheet.Column<User> key="name" header="Name" class="px-2 py-1">
            {(ctx) => ctx.item.name}
          </DataSheet.Column>
          <DataSheet.Column<User>
            key="salary"
            header="Salary"
            class="px-2 py-1 text-right"
            summary={() => <span class="font-bold">Total: {totalSalary().toLocaleString()}</span>}
          >
            {(ctx) => <>{ctx.item.salary.toLocaleString()}</>}
          </DataSheet.Column>
        </DataSheet>
      </section>

      {/* Sorting */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Sorting</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Click header to toggle sort. Shift+Click for multi-sort. autoSort applies automatic sorting.
        </p>
        <DataSheet
          items={users}
          persistKey="sorting"
          sorts={sorts()}
          onSortsChange={setSorts}
          autoSort
        >
          <DataSheet.Column<User> key="name" header="Name" class="px-2 py-1">
            {(ctx) => ctx.item.name}
          </DataSheet.Column>
          <DataSheet.Column<User> key="age" header="Age" class="px-2 py-1">
            {(ctx) => ctx.item.age}
          </DataSheet.Column>
          <DataSheet.Column<User> key="salary" header="Salary" class="px-2 py-1 text-right">
            {(ctx) => <>{ctx.item.salary.toLocaleString()}</>}
          </DataSheet.Column>
          <DataSheet.Column<User>
            key="email"
            header="Email (Not Sortable)"
            class="px-2 py-1"
            sortable={false}
          >
            {(ctx) => ctx.item.email}
          </DataSheet.Column>
        </DataSheet>
      </section>

      {/* Pagination */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Pagination</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Setting itemsPerPage automatically displays pagination.
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

      {/* Tree expansion */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Tree Expansion</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Define tree structure with getChildren. Use caret icons to expand/collapse and vertical guides to show depth.
        </p>
        <DataSheet
          items={categories}
          persistKey="tree"
          getChildren={(item) => item.children}
          expandedItems={expanded()}
          onExpandedItemsChange={setExpanded}
        >
          <DataSheet.Column<Category> key="name" header="Category" class="px-2 py-1">
            {(ctx) => ctx.item.name}
          </DataSheet.Column>
          <DataSheet.Column<Category> key="count" header="Count" class="px-2 py-1 text-right">
            {(ctx) => <>{ctx.item.count.toLocaleString()}</>}
          </DataSheet.Column>
        </DataSheet>
      </section>

      {/* Fixed columns + resizing */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          Fixed Columns + Resizing
        </h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Fixed columns remain on the left when scrolling. Drag the right edge of header to resize, double-click to reset.
        </p>
        <div>
          <DataSheet items={users} persistKey="fixed-resize">
            <DataSheet.Column<User> key="name" header="Name" class="px-2 py-1 font-medium" fixed>
              {(ctx) => ctx.item.name}
            </DataSheet.Column>
            <DataSheet.Column<User> key="age" header="Age" class="px-2 py-1" fixed>
              {(ctx) => ctx.item.age}
            </DataSheet.Column>
            <DataSheet.Column<User> key="email" header="Email" class="px-2 py-1">
              {(ctx) => ctx.item.email}
            </DataSheet.Column>
            <DataSheet.Column<User> key="salary" header="Salary" class="px-2 py-1 text-right">
              {(ctx) => <>{ctx.item.salary.toLocaleString()}</>}
            </DataSheet.Column>
          </DataSheet>
        </div>
      </section>

      {/* Inline editing */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Inline Editing</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Use inset components to edit directly within cells.
        </p>
        <DataSheet items={editUsers} persistKey="cell-edit">
          <DataSheet.Column<User> key="name" header="Name">
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
          <DataSheet.Column<User> key="age" header="Age">
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
          <DataSheet.Column<User> key="birthDate" header="Birth Date">
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
          <DataSheet.Column<User> key="startTime" header="Start Time">
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
          <DataSheet.Column<User> key="createdAt" header="Created At">
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
          <DataSheet.Column<User> key="memo" header="Memo">
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
          <DataSheet.Column<User> key="department" header="Department">
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
          <DataSheet.Column<User> key="active" header="Active">
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

      {/* Multiple selection */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Multiple Selection</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          selectMode="multiple" for checkbox-based multi-select. Shift+Click for range selection.
        </p>
        <DataSheet
          items={users}
          persistKey="select-multi"
          selectMode="multiple"
          selectedItems={multiSelected()}
          onSelectedItemsChange={setMultiSelected}
        >
          <DataSheet.Column<User> key="name" header="Name" class="px-2 py-1">
            {(ctx) => ctx.item.name}
          </DataSheet.Column>
          <DataSheet.Column<User> key="age" header="Age" class="px-2 py-1">
            {(ctx) => ctx.item.age}
          </DataSheet.Column>
          <DataSheet.Column<User> key="email" header="Email" class="px-2 py-1">
            {(ctx) => ctx.item.email}
          </DataSheet.Column>
        </DataSheet>
        <p class="mt-2 text-sm text-base-500">
          Selected items:{" "}
          {multiSelected()
            .map((u) => u.name)
            .join(", ") || "(None)"}
        </p>
      </section>

      {/* Single selection + autoSelect */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          Single Selection + autoSelect
        </h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          selectMode="single" for arrow icon-based single selection. autoSelect="click" to auto-select on row click.
        </p>
        <DataSheet
          items={users}
          persistKey="select-single"
          selectMode="single"
          selectedItems={singleSelected()}
          onSelectedItemsChange={setSingleSelected}
          autoSelect="click"
        >
          <DataSheet.Column<User> key="name" header="Name" class="px-2 py-1">
            {(ctx) => ctx.item.name}
          </DataSheet.Column>
          <DataSheet.Column<User> key="age" header="Age" class="px-2 py-1">
            {(ctx) => ctx.item.age}
          </DataSheet.Column>
          <DataSheet.Column<User> key="salary" header="Salary" class="px-2 py-1 text-right">
            {(ctx) => <>{ctx.item.salary.toLocaleString()}</>}
          </DataSheet.Column>
        </DataSheet>
        <p class="mt-2 text-sm text-base-500">
          Selected items:{" "}
          {singleSelected()
            .map((u) => u.name)
            .join(", ") || "(None)"}
        </p>
      </section>

      {/* Non-selectable items */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Non-selectable Items</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Use isItemSelectable to disable selection of specific items. The reason is displayed as a tooltip.
        </p>
        <DataSheet
          items={users}
          persistKey="select-disabled"
          selectMode="multiple"
          selectedItems={disabledSelected()}
          onSelectedItemsChange={setDisabledSelected}
          isItemSelectable={(item) => (item.salary >= 4500 ? true : "Salary under 4,500 cannot be selected")}
        >
          <DataSheet.Column<User> key="name" header="Name" class="px-2 py-1">
            {(ctx) => ctx.item.name}
          </DataSheet.Column>
          <DataSheet.Column<User> key="salary" header="Salary" class="px-2 py-1 text-right">
            {(ctx) => <>{ctx.item.salary.toLocaleString()}</>}
          </DataSheet.Column>
          <DataSheet.Column<User> key="email" header="Email" class="px-2 py-1">
            {(ctx) => ctx.item.email}
          </DataSheet.Column>
        </DataSheet>
        <p class="mt-2 text-sm text-base-500">
          Selected items:{" "}
          {disabledSelected()
            .map((u) => u.name)
            .join(", ") || "(None)"}
        </p>
      </section>

      {/* Drag reorder */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Drag Reorder</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Setting onItemsReorder automatically adds a drag handle column. Grab the handle and drag to reorder rows.
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
          <DataSheet.Column<User> key="name" header="Name" class="px-2 py-1">
            {(ctx) => ctx.item.name}
          </DataSheet.Column>
          <DataSheet.Column<User> key="age" header="Age" class="px-2 py-1">
            {(ctx) => ctx.item.age}
          </DataSheet.Column>
          <DataSheet.Column<User> key="email" header="Email" class="px-2 py-1">
            {(ctx) => ctx.item.email}
          </DataSheet.Column>
        </DataSheet>
      </section>
    </div>
  );
}
