import { DateTime } from "@simplysm/sd-core-common";
import { Column, ForeignKey, Index, Table } from "@simplysm/sd-orm-common";
import { User } from "./user";

@Table({ description: "시스템 데이터 로그" })
export class SystemDataLog {
  @Column({ description: "ID", autoIncrement: true, primaryKey: 1 })
  id?: number;

  @Index({ name: "tableItem", order: 1 })
  @Column({ description: "테이블명" })
  tableName!: string;

  @Column({ description: "테이블설명", nullable: true })
  tableDescription?: string;

  @Column({ description: "구분" })
  type!: string;

  @Index({ name: "tableItem", order: 2 })
  @Column({ description: "항목.ID", nullable: true })
  itemId?: number;

  @Column({ description: "값(JSON)", dataType: { type: "STRING", length: "MAX" }, nullable: true })
  valueJson?: string;

  @Index({ orderBy: "DESC" })
  @Column({ description: "일시" })
  dateTime!: DateTime;

  @Column({ description: "사용자.ID", nullable: true })
  userId?: number;

  //------------------------------------

  @ForeignKey(["userId"], () => User, "사용자")
  user?: Readonly<User>;
}
