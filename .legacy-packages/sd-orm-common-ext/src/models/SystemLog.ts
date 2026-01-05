import { DateTime } from "@simplysm/sd-core-common";
import { User } from "./User";
import { Column, ForeignKey, Table } from "@simplysm/sd-orm-common";

/** @deprecated */
@Table({ description: "시스템 로그" })
export class SystemLog {
  @Column({ description: "ID", autoIncrement: true, primaryKey: 1 })
  id?: number;

  @Column({ description: "클라이언트명" })
  clientName!: string;

  @Column({ description: "발생일시" })
  dateTime!: DateTime;

  @Column({ description: "구분" })
  type!: string;

  @Column({ description: "메시지", dataType: { type: "STRING", length: "MAX" } })
  message!: string;

  @Column({ description: "사용자.ID", nullable: true })
  userId?: number;

  //------------------------------------

  @ForeignKey(["userId"], () => User, "사용자")
  user?: Readonly<User>;
}
