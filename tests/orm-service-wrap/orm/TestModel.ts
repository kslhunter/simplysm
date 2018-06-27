import {Column, Table} from "@simplism/orm-query";

@Table("SD_TEST_SERVICE")
export class TestModel {
  @Column({primaryKey: 1, autoIncrement: true})
  public id?: number;

  @Column()
  public name!: string;
}