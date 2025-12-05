import { User } from "./User";
import { Column, ForeignKey, Table } from "@simplysm/sd-orm-common";

/** @deprecated */
@Table({ description: "사용자권한" })
export class UserPermission {
  @Column({ description: "사용자.ID", primaryKey: 1 })
  userId!: number;

  @Column({ description: "코드", primaryKey: 2 })
  code!: string;

  @Column({ description: "값(JSON)", dataType: { type: "STRING", length: "MAX" } })
  valueJson!: string;

  //------------------------------------

  @ForeignKey(["userId"], () => User, "사용자")
  user?: Readonly<User>;
}
