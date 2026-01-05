import { Table } from "../../src/schema/table-builder";

export const MonthlySales = Table("MonthlySales")
  .columns((c) => ({
    id: c.bigint().primaryKey().autoIncrement(),
    category: c.varchar(50),
    jan: c.int().nullable(),
    feb: c.int().nullable(),
    mar: c.int().nullable(),
  }));
