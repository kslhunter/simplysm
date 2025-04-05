import { DateTime } from "@simplysm/sd-core-common";
import { User } from "./user";
import { Column, ForeignKey, Table } from "@simplysm/sd-orm-common";

@Table({ description: "시스템 에러로그" })
export class SystemErrorLog {
  @Column({ description: "ID", autoIncrement: true, primaryKey: 1 })
  id?: number;

  @Column({ description: "클라이언트명" })
  clientName!: string;

  @Column({ description: "발생일시" })
  dateTime!: DateTime;

  @Column({ description: "구분" })
  type!: string;

  @Column({ description: "데이터(JSON)", dataType: { type: "STRING", length: "MAX" } })
  jsonData!: string;

  @Column({ description: "사용자.ID", nullable: true })
  userId?: number;

  //------------------------------------

  @ForeignKey(["userId"], () => User, "사용자")
  user?: Readonly<User>;
}
