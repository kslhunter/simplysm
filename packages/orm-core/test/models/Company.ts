import {Column, Table} from "../../src/decorators";

@Table("GLINT")
export class Company {
  @Column({primaryKey: 1, autoIncrement: true})
  public id?: number;

  @Column()
  public name!: string;
}