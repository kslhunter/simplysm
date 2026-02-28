import { Table } from "@simplysm/orm-common";
import { Employee } from "./Employee";

export const _Log = Table("_Log")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    clientName: c.varchar(200),
    dateTime: c.datetime(),
    severity: c.varchar(50),
    message: c.text(),
    employeeId: c.bigint().nullable(),
  }))
  .primaryKey("id")
  .relations((r) => ({
    employee: r.foreignKey(["employeeId"], () => Employee),
  }));
