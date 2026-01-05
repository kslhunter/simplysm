import { Table } from "@simplysm/orm-common";

export const TestUser = Table("TestUser").columns((c) => ({
  id: c.bigint().primaryKey().autoIncrement(),
  name: c.varchar(100),
  email: c.varchar(200).nullable(),
  age: c.int().nullable(),
  isActive: c.boolean().default(true),
  companyId: c.bigint().nullable(),
}));