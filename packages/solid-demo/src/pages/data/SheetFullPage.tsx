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
  "김",
  "이",
  "박",
  "최",
  "정",
  "강",
  "조",
  "윤",
  "장",
  "임",
  "한",
  "오",
  "서",
  "신",
  "권",
  "황",
  "안",
  "송",
  "류",
  "홍",
];
const firstNames = [
  "민준",
  "서윤",
  "도윤",
  "서연",
  "하준",
  "지우",
  "시우",
  "하은",
  "예준",
  "지아",
  "주원",
  "수아",
  "지호",
  "다은",
  "건우",
  "채원",
  "현우",
  "지윤",
  "우진",
  "은서",
];
const departments = [
  "개발",
  "개발",
  "개발",
  "마케팅",
  "마케팅",
  "영업",
  "영업",
  "인사",
  "재무",
  "디자인",
];
const teams = [
  "프론트엔드",
  "백엔드",
  "인프라",
  "디지털마케팅",
  "브랜드",
  "국내영업",
  "해외영업",
  "채용",
  "회계",
  "UI/UX",
];
const positions = ["사원", "사원", "사원", "주임", "대리", "과장", "차장", "부장"];
const statuses = ["재직", "재직", "재직", "재직", "재직", "재직", "재직", "휴직", "출장"];

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
          header={["인사정보", "이름"]}
          class="px-2 py-1 font-medium"
          fixed
        >
          {(ctx) => ctx.item.name}
        </DataSheet.Column>
        <DataSheet.Column<Employee>
          key="department"
          header={["인사정보", "부서"]}
          class="px-2 py-1"
          fixed
        >
          {(ctx) => ctx.item.department}
        </DataSheet.Column>
        <DataSheet.Column<Employee> key="team" header={["인사정보", "팀"]} class="px-2 py-1">
          {(ctx) => ctx.item.team}
        </DataSheet.Column>
        <DataSheet.Column<Employee> key="position" header={["인사정보", "직급"]} class="px-2 py-1">
          {(ctx) => ctx.item.position}
        </DataSheet.Column>
        <DataSheet.Column<Employee> key="email" header={["연락처", "이메일"]} class="px-2 py-1">
          {(ctx) => ctx.item.email}
        </DataSheet.Column>
        <DataSheet.Column<Employee> key="phone" header={["연락처", "전화번호"]} class="px-2 py-1">
          {(ctx) => ctx.item.phone}
        </DataSheet.Column>
        <DataSheet.Column<Employee> key="joinDate" header="입사일" class="px-2 py-1">
          {(ctx) => ctx.item.joinDate}
        </DataSheet.Column>
        <DataSheet.Column<Employee>
          key="salary"
          header={["급여정보", "기본급"]}
          class="px-2 py-1 text-right"
          summary={() => <span class="font-bold">{totalSalary().toLocaleString()}만</span>}
        >
          {(ctx) => <>{ctx.item.salary.toLocaleString()}만</>}
        </DataSheet.Column>
        <DataSheet.Column<Employee>
          key="bonus"
          header={["급여정보", "상여금"]}
          class="px-2 py-1 text-right"
          summary={() => <span class="font-bold">{totalBonus().toLocaleString()}만</span>}
        >
          {(ctx) => <>{ctx.item.bonus.toLocaleString()}만</>}
        </DataSheet.Column>
        <DataSheet.Column<Employee> key="status" header="상태" class="px-2 py-1">
          {(ctx) => ctx.item.status}
        </DataSheet.Column>
      </DataSheet>
    </div>
  );
}
