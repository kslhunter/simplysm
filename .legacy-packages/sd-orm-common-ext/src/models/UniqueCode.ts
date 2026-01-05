import { Column, Table } from "@simplysm/sd-orm-common";

/** @deprecated */
@Table({ description: "코드정보" })
export class UniqueCode {
  @Column({ description: "코드(prefix? + seq)", primaryKey: 1 })
  code!: string;

  @Column({ description: "순번" })
  seq!: number;
}
