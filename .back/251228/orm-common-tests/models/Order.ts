import { Table } from "../../src/schema/table-builder";
import { User } from "./User";

export const Order = Table("Order")
  .columns((c) => ({
    id: c.bigint().primaryKey().autoIncrement(),
    userId: c.bigint(),
    amount: c.int(),
    createdAt: c.datetime(),
  }))
  .relations((r) => ({
    user: r.foreignKey(
      (c) => [c.userId],
      () => User,
    ),
  }));
