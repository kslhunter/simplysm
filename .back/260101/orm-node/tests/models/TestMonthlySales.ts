import { Table } from "@simplysm/orm-common";

export const TestMonthlySales = Table("TestMonthlySales").columns((c) => ({
  id: c.bigint().primaryKey().autoIncrement(),
  category: c.varchar(50),
  jan: c.int().nullable(),
  feb: c.int().nullable(),
  mar: c.int().nullable(),
}));