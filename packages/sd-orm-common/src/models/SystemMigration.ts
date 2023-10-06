import {Column, Table} from "../decorators";

@Table({name: "_migration", description: "마이그레이션"})
export class SystemMigration {
  @Column({primaryKey: 1, description: "코드"})
  public code!: string;
}
