import { Table } from "../../src/schema/table-builder";

export const Sales = Table("Sales")
  .columns((c) => ({
    id: c.bigint().primaryKey().autoIncrement(),
    category: c.varchar(50),
    month: c.varchar(10),
    amount: c.int(),
  }));
