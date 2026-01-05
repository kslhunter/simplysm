import { Table } from "@simplysm/orm-common";

export const TestUserBackup = Table("TestUserBackup").columns((c) => ({
  id: c.bigint().primaryKey().autoIncrement(),
  name: c.varchar(100),
  email: c.varchar(200).nullable(),
}));