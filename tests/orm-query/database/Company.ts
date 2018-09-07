import {Column, ForeignKeyTarget, Table} from "@simplism/orm-query";
import {Employee} from "./Employee";

@Table()
export class Company {
  @Column({primaryKey: 1, autoIncrement: true})
  public id?: number;

  @Column()
  public name!: string;

  //------------------------------------

  @ForeignKeyTarget(() => Employee, "company")
  public employees?: Employee;
}