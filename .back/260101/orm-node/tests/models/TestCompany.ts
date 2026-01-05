import { Table } from "@simplysm/orm-common";

export const TestCompany = Table("TestCompany").columns((c) => ({
  id: c.bigint().primaryKey().autoIncrement(),
  name: c.varchar(100),
  address: c.varchar(200).nullable(),
}));