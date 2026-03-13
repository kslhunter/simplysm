import { Table } from "@simplysm/orm-common";
import { Employee } from "./Employee";

export const _DataLog = Table("_DataLog")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    tableName: c.varchar(200),
    tableDescription: c.varchar(200).nullable(),
    action: c.varchar(50),
    itemId: c.bigint().nullable(),
    valueJson: c.text().nullable(),
    dateTime: c.datetime(),
    employeeId: c.bigint().nullable(),
  }))
  .primaryKey("id")
  .indexes((i) => [i.index("tableName", "itemId"), i.index("dateTime").orderBy("DESC")])
  .relations((r) => ({
    employee: r.foreignKey(["employeeId"], () => Employee),
  }));
