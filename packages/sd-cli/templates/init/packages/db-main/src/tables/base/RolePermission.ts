import { Table } from "@simplysm/orm-common";
import { Role } from "./Role";

export const RolePermission = Table("RolePermission")
  .columns((c) => ({
    roleId: c.bigint(),
    code: c.varchar(200),
    valueJson: c.text(),
  }))
  .primaryKey("roleId", "code")
  .relations((r) => ({
    role: r.foreignKey(["roleId"], () => Role),
  }));
