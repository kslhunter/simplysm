import { Table } from "../../src/schema/table-builder";

export const Company = Table("Company")
  .columns((c) => ({
    id: c.bigint().primaryKey().autoIncrement(),
    name: c.varchar(200),
    foundedAt: c.date().nullable(),
  }));
