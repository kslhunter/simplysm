import { Table } from "../../src/schema/table-builder";

export const UserBackup = Table("UserBackup")
  .columns((c) => ({
    id: c.bigint().primaryKey().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
  }));
