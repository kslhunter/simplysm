import { Table } from "../../../src/schema/table-builder";
import { Post } from "./Post";
import { Company } from "./Company";

export const User = Table("User")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    age: c.int().nullable(),
    isActive: c.boolean().default(true),
    companyId: c.bigint().nullable(),
    createdAt: c.datetime(),
  }))
  .primaryKey("id")
  .relations((r) => ({
    company: r.foreignKey(["companyId"], () => Company),
    posts: r.foreignKeyTarget(() => Post, "user"),
  }));
