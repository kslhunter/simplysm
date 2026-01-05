import { Table } from "../../../src/schema/table-builder";

export const Employee = Table("Employee")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    managerId: c.bigint().nullable(), // 자기 참조 (상위 매니저)
    departmentId: c.bigint().nullable(),
  }))
  .primaryKey("id");