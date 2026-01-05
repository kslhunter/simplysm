import { Table } from "../schema/table-builder";

export const SystemMigration = Table("SystemMigration")
  .columns((c) => ({
    code: c.varchar(255),
  }))
  .description("System Migration Table")
  .primaryKey("code");
