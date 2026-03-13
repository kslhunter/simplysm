import { defineDbContext, type DbContextInstance } from "@simplysm/orm-common";
// base
import { Employee } from "./tables/base/Employee";
import { Role } from "./tables/base/Role";
import { RolePermission } from "./tables/base/RolePermission";
import { EmployeeConfig } from "./tables/base/EmployeeConfig";
// system
import { _Log } from "./tables/system/_Log";
import { _DataLog } from "./tables/system/_DataLog";

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
