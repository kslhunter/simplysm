import { Column, ForeignKeyTarget, Index, Table } from "@simplysm/sd-orm-common";
import { UserConfig } from "./user-config";
import { UserPermission } from "./user-permission";

@Table({ description: "사용자" })
export class User {
  @Column({ description: "ID", autoIncrement: true, primaryKey: 1 })
  id?: number;

  @Index()
  @Column({ description: "이름" })
  name!: string;

  @Column({ description: "이메일", nullable: true })
  email?: string;

  @Index()
  @Column({ description: "로그인아이디", nullable: true })
  loginId?: string;

  @Column({ description: "암호화된 비밀번호", nullable: true })
  encryptedPassword?: string;

  @Column({ description: "삭제여부" })
  isDeleted!: boolean;

  //------------------------------------

  @ForeignKeyTarget(() => UserConfig, "user", "설정목록")
  configs?: Readonly<UserConfig>[];

  @ForeignKeyTarget(() => UserPermission, "user", "권한목록")
  permissions?: Readonly<UserPermission>[];
}
