import { Table } from "@simplysm/orm-common";

export const TestOrder = Table("TestOrder").columns((c) => ({
  id: c.bigint().primaryKey().autoIncrement(),
  userId: c.bigint(),
  productName: c.varchar(200),
  amount: c.int().default(1),
}));