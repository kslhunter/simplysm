export const fc_package_DbModel = (opt: { name: string; description: string }): string => /* language=ts */ `

import { Column, Table } from "@simplysm/sd-orm-common";

@Table({ description: "${opt.description}" })
export class ${opt.name} {
  @Column({ description: "ID", autoIncrement: true, primaryKey: 1 })
  public id?: number;
}

`.trim();
