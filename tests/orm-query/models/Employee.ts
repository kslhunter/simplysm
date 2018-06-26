import {Column, ForeignKey, Table} from "@simplism/orm-query";
import {Company} from "./Company";

@Table("SD_ORM_QUERY")
export class Employee {
  @Column({primaryKey: 1, autoIncrement: true})
  public id?: number;

  @Column()
  public companyId!: number;

  @Column()
  public name!: string;

  @Column()
  public encryptedPassword!: string;

  @Column()
  public isDisabled!: boolean;

  //------------------------------------

  @ForeignKey("companyId", () => Company)
  public company?: Company;
}