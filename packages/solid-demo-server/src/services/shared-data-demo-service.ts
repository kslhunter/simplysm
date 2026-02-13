import { defineService } from "@simplysm/service-server";

export interface IDemoUser {
  id: number;
  name: string;
  department: string;
}

export interface IDemoCompany {
  id: number;
  name: string;
  ceo: string;
}

const USERS: IDemoUser[] = [
  { id: 1, name: "홍길동", department: "개발팀" },
  { id: 2, name: "김영희", department: "디자인팀" },
  { id: 3, name: "이철수", department: "개발팀" },
  { id: 4, name: "박민수", department: "기획팀" },
  { id: 5, name: "정다은", department: "디자인팀" },
];

const COMPANIES: IDemoCompany[] = [
  { id: 1, name: "심플리즘", ceo: "홍길동" },
  { id: 2, name: "테크놀로지", ceo: "김영희" },
  { id: 3, name: "이노베이션", ceo: "이철수" },
];

export const SharedDataDemoService = defineService("SharedDataDemo", () => ({
  getUsers: (changeKeys?: number[]): IDemoUser[] => {
    if (changeKeys) {
      return USERS.filter((u) => changeKeys.includes(u.id));
    }
    return USERS;
  },

  getCompanies: (changeKeys?: number[]): IDemoCompany[] => {
    if (changeKeys) {
      return COMPANIES.filter((c) => changeKeys.includes(c.id));
    }
    return COMPANIES;
  },
}));
