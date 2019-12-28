import {Column, Table} from "./decorator";

@Table({name: "_migration", description: "마이그레이션"})
export class DbMigrationModel {
  @Column({primaryKey: 1, description: "코드"})
  public code!: string;
}

@Table({
  database: "master",
  schema: "dbo",
  name: "sysdatabases",
  description: "데이터베이스 정보"
})
export class DbDatabaseInfoModel {
  @Column({description: "DB명"})
  public name!: string;
}

@Table({
  schema: "INFORMATION_SCHEMA",
  name: "TABLES",
  description: "테이블"
})
export class DbTableInfoModel {
  @Column({name: "TABLE_NAME", description: "테이블명"})
  public name!: string;
}
