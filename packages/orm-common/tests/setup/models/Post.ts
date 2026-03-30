import { Table } from "../../../src/schema/table-builder";
import { User } from "./User";

export const Post = Table("Post")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    userId: c.bigint(),
    title: c.varchar(300),
    content: c.text().nullable(),
    viewCount: c.int().default(0),
    publishedAt: c.datetime().nullable(),
  }))
  .primaryKey("id")
  .relations((r) => ({
    user: r.foreignKey(["userId"], () => User),
  }));
