import { Table } from "@simplysm/orm-common";
import { Employee } from "./Employee";

export const EmployeeConfig = Table("EmployeeConfig")
  .columns((c) => ({
    employeeId: c.bigint(),
    code: c.varchar(200),
    valueJson: c.text(),
  }))
  .primaryKey("employeeId", "code")
  .relations((r) => ({
    employee: r.foreignKey(["employeeId"], () => Employee),
  }));
