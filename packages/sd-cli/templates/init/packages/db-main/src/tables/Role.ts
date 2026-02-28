import { Table } from "@simplysm/orm-common";

export const Role = Table("Role")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    isDeleted: c.boolean().default(false),
  }))
  .primaryKey("id");
