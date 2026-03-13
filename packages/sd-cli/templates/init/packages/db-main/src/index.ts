// base
export * from "./tables/base/Role";
export * from "./tables/base/RolePermission";
export * from "./tables/base/Employee";
export * from "./tables/base/EmployeeConfig";

// system
export * from "./tables/system/_Log";
export * from "./tables/system/_DataLog";

export { MainDbContext } from "./MainDbContext";
export { expr } from "@simplysm/orm-common";
import "./dataLogExt";
export type { IDataLogJoinOptions, IDataLogJoinResult, IInsertDataLogParam } from "./dataLogExt";
