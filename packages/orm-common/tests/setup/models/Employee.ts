import { Table } from "../../../src/schema/table-builder";

export const Employee = Table("Employee")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    managerId: c.bigint().nullable(), // self-referencing (parent manager)
    departmentId: c.bigint().nullable(),
  }))
  .primaryKey("id");
