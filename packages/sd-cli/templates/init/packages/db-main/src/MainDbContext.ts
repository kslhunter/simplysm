import { defineDbContext, type DbContextInstance } from "@simplysm/orm-common";
import { Employee } from "./tables/Employee";
import { Role } from "./tables/Role";
import { RolePermission } from "./tables/RolePermission";
import { EmployeeConfig } from "./tables/EmployeeConfig";
import { _Log } from "./tables/_Log";
import { _DataLog } from "./tables/_DataLog";

export const MainDbContext = defineDbContext({
  tables: {
    employee: Employee,
    role: Role,
    rolePermission: RolePermission,
    employeeConfig: EmployeeConfig,
    _log: _Log,
    _dataLog: _DataLog,
  },
});

export type MainDbContext = DbContextInstance<typeof MainDbContext>;
