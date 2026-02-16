import { Table } from "../schema/table-builder";

export const _Migration = Table("_Migration")
  .columns((c) => ({
    code: c.varchar(255),
  }))
  .description("System Migration Table")
  .primaryKey("code");
