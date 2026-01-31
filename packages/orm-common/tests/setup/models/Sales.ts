import { Table } from "../../../src/schema/table-builder";

export const Sales = Table("Sales")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    category: c.varchar(50),
    year: c.int(),
    amount: c.int(),
  }))
  .primaryKey("id");
