import { Table } from "../../src/schema/table-builder";
import { User } from "./User";

export const Post = Table("Post")
  .columns((c) => ({
    id: c.bigint().primaryKey().autoIncrement(),
    userId: c.bigint(),
    title: c.varchar(300),
    content: c.text().nullable(),
    viewCount: c.int().default(0),
    publishedAt: c.datetime().nullable(),
  }))
  .relations((r) => ({
    user: r.foreignKey(
      (c) => [c.userId],
      () => User,
    ),
  }));
