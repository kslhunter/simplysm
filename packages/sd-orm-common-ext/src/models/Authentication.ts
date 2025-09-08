import { DateTime, Uuid } from "@simplysm/sd-core-common";
import { Column, ForeignKey, Index, Table } from "@simplysm/sd-orm-common";
import { User } from "./User";

@Table({ description: "인증" })
export class Authentication {
  @Column({ description: "인증키", primaryKey: 1 })
  key!: Uuid;

  @Index({ unique: true })
  @Column({ description: "사용자.ID" })
  userId!: number;

  @Column({ description: "최종인증일시" })
  lastDateTime!: DateTime;

  //------------------------------------

  @ForeignKey(["userId"], () => User, "사용자")
  user?: Readonly<User>;
}
