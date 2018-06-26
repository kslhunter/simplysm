import {Column, Table} from "@simplism/orm-query";

@Table("SD_TEST_ORM_QUERY")
export class Company {
  @Column({primaryKey: 1, autoIncrement: true})
  public id?: number;

  @Column()
  public name!: string;
}