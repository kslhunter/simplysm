import { Table } from "@simplysm/orm-common";
import { Role } from "./Role";

export const Employee = Table("Employee")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    phoneNumber: c.varchar(50).nullable(),
    birthDate: c.date().nullable(),
    enteringDate: c.date().nullable(),
    leavingDate: c.date().nullable(),
    socialSecurityNumber: c.varchar(20).nullable(),
    payrollAccountBank: c.varchar(100).nullable(),
    payrollAccountNumber: c.varchar(100).nullable(),
    encryptedPassword: c.varchar(200).nullable(),
    roleId: c.bigint().nullable(),
    isDeleted: c.boolean().default(false),
  }))
  .primaryKey("id")
  .indexes((i) => [i.index("email").unique()])
  .relations((r) => ({
    role: r.foreignKey(["roleId"], () => Role),
  }));
