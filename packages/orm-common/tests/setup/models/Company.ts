import { Table } from "../../../src/schema/table-builder";
import { User } from "./User";

export const Company = Table("Company")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(200),
    foundedAt: c.date().nullable(),
  }))
  .primaryKey("id")
  .relations((r) => ({
    users: r.foreignKeyTarget(() => User, "company"),
  }));
