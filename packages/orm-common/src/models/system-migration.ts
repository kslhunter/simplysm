import { Table } from "../schema/table-builder";

export const _Migration = Table("_migration")
  .columns((c) => ({
    code: c.varchar(255),
  }))
  .description("시스템 마이그레이션 테이블")
  .primaryKey("code");
