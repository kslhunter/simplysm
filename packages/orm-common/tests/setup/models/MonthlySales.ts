import { Table } from "../../../src/schema/table-builder";

export const MonthlySales = Table("MonthlySales")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    category: c.varchar(50),
    jan: c.int(),
    feb: c.int(),
    mar: c.int(),
  }))
  .primaryKey("id");
