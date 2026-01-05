import { Table } from "@simplysm/orm-common";

export const TestSales = Table("TestSales").columns((c) => ({
  id: c.bigint().primaryKey().autoIncrement(),
  category: c.varchar(50),
  month: c.varchar(10),
  amount: c.int(),
}));