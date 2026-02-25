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
  { id: 1, name: "John Doe", department: "Development" },
  { id: 2, name: "Jane Smith", department: "Design" },
  { id: 3, name: "Bob Wilson", department: "Development" },
  { id: 4, name: "Alice Johnson", department: "Planning" },
  { id: 5, name: "Charlie Brown", department: "Design" },
];

const COMPANIES: IDemoCompany[] = [
  { id: 1, name: "Simplysm", ceo: "John Doe" },
  { id: 2, name: "Technology", ceo: "Jane Smith" },
  { id: 3, name: "Innovation", ceo: "Bob Wilson" },
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
