import { createSignal } from "solid-js";
import { DataSheet, type SortingDef } from "@simplysm/solid";

interface Employee {
  id: number;
  name: string;
  department: string;
  team: string;
  position: string;
  email: string;
  phone: string;
  joinDate: string;
  salary: number;
  bonus: number;
  status: string;
}

const lastNames = [
  "Kim",
  "Lee",
  "Park",
  "Choi",
  "Jung",
  "Kang",
  "Jo",
  "Yoon",
  "Jang",
  "Im",
  "Han",
  "Oh",
  "Seo",
  "Shin",
  "Kwon",
  "Hwang",
  "An",
  "Song",
  "Ryu",
  "Hong",
];
const firstNames = [
  "Min",
  "Seo",
  "Do",
  "Ji",
  "Ha",
  "Jae",
  "Si",
  "Ye",
  "Ju",
  "Su",
  "Ho",
  "Da",
  "Gun",
  "Chae",
  "Hyun",
  "Woo",
  "Jin",
  "Eun",
  "Mi",
  "Na",
];
const departments = [
  "Development",
  "Development",
  "Development",
  "Marketing",
  "Marketing",
  "Sales",
  "Sales",
  "HR",
  "Finance",
  "Design",
];
const teams = [
  "Frontend",
  "Backend",
  "Infrastructure",
  "Digital Marketing",
  "Brand",
  "Domestic Sales",
  "International Sales",
  "Recruitment",
  "Accounting",
  "UI/UX",
];
const positions = ["Staff", "Staff", "Staff", "Assistant", "Senior", "Manager", "Director", "Executive"];
const statuses = ["Active", "Active", "Active", "Active", "Active", "Active", "Active", "On Leave", "Business Trip"];

function generateEmployees(count: number): Employee[] {
  const result: Employee[] = [];
  for (let i = 0; i < count; i++) {
    const lastName = lastNames[i % lastNames.length];
    const firstName = firstNames[(i * 7 + 3) % firstNames.length];
    const deptIdx = i % departments.length;
    const year = 2015 + (i % 10);
    const month = String((i % 12) + 1).padStart(2, "0");
    const day = String((i % 28) + 1).padStart(2, "0");
    result.push({
      id: i + 1,
      name: `${lastName}${firstName}`,
      department: departments[deptIdx],
      team: teams[deptIdx],
      position: positions[i % positions.length],
      email: `user${i + 1}@example.com`,
      phone: `010-${String(1000 + ((i * 37) % 9000)).padStart(4, "0")}-${String(1000 + ((i * 53) % 9000)).padStart(4, "0")}`,
      joinDate: `${year}-${month}-${day}`,
      salary: 3000 + Math.floor((i * 17) % 5000),
      bonus: 100 + Math.floor((i * 13) % 900),
      status: statuses[i % statuses.length],
    });
  }
  return result;
}

const employees = generateEmployees(200);

export default function SheetFullPage() {
  const totalSalary = () => employees.reduce((sum, e) => sum + e.salary, 0);
  const totalBonus = () => employees.reduce((sum, e) => sum + e.bonus, 0);
  const [sorts, setSorts] = createSignal<SortingDef[]>([]);
  const [page, setPage] = createSignal(1);

  return (
    <div class="flex h-full flex-col overflow-hidden p-2">
      <DataSheet
        items={employees}
        persistKey="full"
        class="h-full"
        inset
        sorts={sorts()}
        onSortsChange={setSorts}
        autoSort
        itemsPerPage={20}
        page={page()}
        onPageChange={setPage}
      >
        <DataSheet.Column<Employee>
          key="id"
          header="No."
          class="px-2 py-1 text-right text-base-500"
          fixed
        >
          {(ctx) => ctx.item.id}
        </DataSheet.Column>
        <DataSheet.Column<Employee>
          key="name"
          header={["Employee Info", "Name"]}
          class="px-2 py-1 font-medium"
          fixed
        >
          {(ctx) => ctx.item.name}
        </DataSheet.Column>
        <DataSheet.Column<Employee>
          key="department"
          header={["Employee Info", "Department"]}
          class="px-2 py-1"
          fixed
        >
          {(ctx) => ctx.item.department}
        </DataSheet.Column>
        <DataSheet.Column<Employee> key="team" header={["Employee Info", "Team"]} class="px-2 py-1">
          {(ctx) => ctx.item.team}
        </DataSheet.Column>
        <DataSheet.Column<Employee> key="position" header={["Employee Info", "Position"]} class="px-2 py-1">
          {(ctx) => ctx.item.position}
        </DataSheet.Column>
        <DataSheet.Column<Employee> key="email" header={["Contact", "Email"]} class="px-2 py-1">
          {(ctx) => ctx.item.email}
        </DataSheet.Column>
        <DataSheet.Column<Employee> key="phone" header={["Contact", "Phone"]} class="px-2 py-1">
          {(ctx) => ctx.item.phone}
        </DataSheet.Column>
        <DataSheet.Column<Employee> key="joinDate" header="Join Date" class="px-2 py-1">
          {(ctx) => ctx.item.joinDate}
        </DataSheet.Column>
        <DataSheet.Column<Employee>
          key="salary"
          header={["Salary Info", "Base"]}
          class="px-2 py-1 text-right"
          summary={() => <span class="font-bold">{totalSalary().toLocaleString()}</span>}
        >
          {(ctx) => <>{ctx.item.salary.toLocaleString()}</>}
        </DataSheet.Column>
        <DataSheet.Column<Employee>
          key="bonus"
          header={["Salary Info", "Bonus"]}
          class="px-2 py-1 text-right"
          summary={() => <span class="font-bold">{totalBonus().toLocaleString()}</span>}
        >
          {(ctx) => <>{ctx.item.bonus.toLocaleString()}</>}
        </DataSheet.Column>
        <DataSheet.Column<Employee> key="status" header="Status" class="px-2 py-1">
          {(ctx) => ctx.item.status}
        </DataSheet.Column>
      </DataSheet>
    </div>
  );
}
