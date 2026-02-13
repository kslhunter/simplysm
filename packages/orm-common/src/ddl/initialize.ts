import type { DbContextBase, DbContextDef, DbContextDdlMethods } from "../types/db-context-def";
import type { Queryable } from "../exec/queryable";
import type { QueryDef } from "../types/query-def";
import { TableBuilder } from "../schema/table-builder";
import { ViewBuilder } from "../schema/view-builder";
import { ProcedureBuilder } from "../schema/procedure-builder";
import {
  ForeignKeyBuilder,
  RelationKeyBuilder,
  ForeignKeyTargetBuilder,
  RelationKeyTargetBuilder,
} from "../schema/factory/relation-builder";
import { getCreateObjectQueryDef } from "./table-ddl";
import { getAddFkQueryDef, getAddIdxQueryDef } from "./relation-ddl";
import { getClearSchemaQueryDef, getSchemaExistsQueryDef } from "./schema-ddl";

/**
 * Code First 데이터베이스 초기화
 *
 * DbContext에 정의된 테이블/뷰/프로시저를 데이터베이스에 생성하고,
 * 마이그레이션을 적용
 *
 * @param db - DbContext 인스턴스
 * @param def - DbContext 정의
 * @param options - 초기화 옵션
 * @param options.dbs - 초기화 대상 데이터베이스 목록 (미지정 시 현재 database)
 * @param options.force - true 시 기존 스키마 삭제 후 전체 재생성
 * @throws {Error} 초기화할 데이터베이스가 없을 때
 * @throws {Error} 지정한 데이터베이스가 존재하지 않을 때
 *
 * 동작 방식:
 * - **force=true**: clearSchema → 전체 생성 → 모든 migration "적용됨" 등록
 * - **force=false** (기본):
 *   - SystemMigration 테이블 없음: 전체 생성 + 모든 migration 등록
 *   - SystemMigration 테이블 있음: 미적용 migration만 실행
 */
export async function initialize(
  db: DbContextBase & DbContextDdlMethods & { systemMigration: () => Queryable<{ code: string }, any> },
  def: DbContextDef<any, any, any>,
  options?: { dbs?: string[]; force?: boolean },
): Promise<void> {
  const dbNames = options?.dbs ?? (db.database !== undefined ? [db.database] : []);
  if (dbNames.length < 1) {
    throw new Error("초기화할 데이터베이스가 없습니다.");
  }

  const force = options?.force ?? false;

  // 1. DB 존재 확인
  for (const dbName of dbNames) {
    const schemaExistsDef = getSchemaExistsQueryDef(dbName, db.schema);
    const result = await db.executeDefs([schemaExistsDef]);
    const schemaExists = result[0].length > 0;
    if (!schemaExists) {
      throw new Error(`데이터베이스 '${dbName}'가 존재하지 않습니다.`);
    }
  }

  if (force) {
    // 2. force: dbs 전체 초기화
    for (const dbName of dbNames) {
      const clearDef = getClearSchemaQueryDef({ database: dbName, schema: db.schema });
      await db.executeDefs([clearDef]);
    }
    await createAllObjects(db, def);

    // 모든 migration을 "적용됨"으로 등록
    if (def.meta.migrations.length > 0) {
      await db.systemMigration().insert(def.meta.migrations.map((m) => ({ code: m.name })));
    }
  } else {
    // 3. Migration 기반 초기화
    let appliedMigrations: { code: string }[] | undefined;
    try {
      appliedMigrations = await db.systemMigration().result();
    } catch (err) {
      // 테이블 없음 = 신규 환경
      if (!isTableNotExistsError(err)) {
        throw err;
      }
    }

    if (appliedMigrations == null) {
      // 신규 환경: 전체 생성
      await createAllObjects(db, def);

      // 모든 migration을 "적용됨"으로 등록
      if (def.meta.migrations.length > 0) {
        await db.systemMigration().insert(def.meta.migrations.map((m) => ({ code: m.name })));
      }
    } else {
      // 기존 환경: 미적용 migration만 실행
      const appliedCodes = new Set(appliedMigrations.map((m) => m.code));
      const pendingMigrations = def.meta.migrations.filter((m) => !appliedCodes.has(m.name));

      for (const migration of pendingMigrations) {
        await migration.up(db);
        await db.systemMigration().insert([{ code: migration.name }]);
      }
    }
  }
}

/**
 * 전체 객체 생성 (테이블/뷰/프로시저/FK/Index)
 */
async function createAllObjects(db: DbContextBase, def: DbContextDef<any, any, any>): Promise<void> {
  // 1. 테이블/뷰/프로시저 생성
  const builders = getBuilders(def);
  const createDefs: QueryDef[] = [];
  for (const builder of builders) {
    createDefs.push(getCreateObjectQueryDef(db, builder));
  }
  if (createDefs.length > 0) {
    await db.executeDefs(createDefs);
  }

  // 2. FK 생성 (TableBuilder만)
  const tables = builders.filter((b) => b instanceof TableBuilder);
  const addFkDefs: QueryDef[] = [];
  for (const table of tables) {
    const relations = table.meta.relations;
    if (relations == null) continue;

    const tableDef = db.getQueryDefObjectName(table);
    for (const [relationName, relationDef] of Object.entries(relations)) {
      if (!(relationDef instanceof ForeignKeyBuilder)) continue;

      addFkDefs.push(getAddFkQueryDef(db, tableDef, relationName, relationDef));
    }
  }
  if (addFkDefs.length > 0) {
    await db.executeDefs(addFkDefs);
  }

  // 3. Index 생성 (TableBuilder만)
  const createIndexDefs: QueryDef[] = [];
  for (const table of tables) {
    const indexes = table.meta.indexes;
    if (indexes == null || indexes.length === 0) continue;

    const indexTableDef = db.getQueryDefObjectName(table);
    for (const indexBuilder of indexes) {
      createIndexDefs.push(getAddIdxQueryDef(indexTableDef, indexBuilder));
    }
  }
  if (createIndexDefs.length > 0) {
    await db.executeDefs(createIndexDefs);
  }
}

/**
 * DbContext의 모든 Builder 수집 (Table/View/Procedure)
 */
function getBuilders(
  def: DbContextDef<any, any, any>,
): (TableBuilder<any, any> | ViewBuilder<any, any, any> | ProcedureBuilder<any, any>)[] {
  const builders: (TableBuilder<any, any> | ViewBuilder<any, any, any> | ProcedureBuilder<any, any>)[] = [];

  // Tables
  for (const table of Object.values(def.meta.tables) as TableBuilder<any, any>[]) {
    builders.push(table);
  }

  // Views
  for (const view of Object.values(def.meta.views) as ViewBuilder<any, any, any>[]) {
    builders.push(view);
  }

  // Procedures
  for (const proc of Object.values(def.meta.procedures) as ProcedureBuilder<any, any>[]) {
    builders.push(proc);
  }

  return builders;
}

/**
 * ForeignKeyTarget/RelationKeyTarget 관계의 유효성 검증
 * - targetTableFn()이 반환하는 테이블에 relationName에 해당하는 FK/RelationKey가 있는지 확인
 */
export function validateRelations(def: DbContextDef<any, any, any>): void {
  const builders = getBuilders(def);
  const tables = builders.filter((b) => b instanceof TableBuilder);

  for (const table of tables) {
    const relations = table.meta.relations;
    if (relations == null) continue;

    for (const [relName, relDef] of Object.entries(relations)) {
      if (!(relDef instanceof ForeignKeyTargetBuilder) && !(relDef instanceof RelationKeyTargetBuilder)) {
        continue;
      }

      const targetTable = relDef.meta.targetTableFn();
      const fkRelName = relDef.meta.relationName;
      const fkRel = targetTable.meta.relations?.[fkRelName];

      if (!(fkRel instanceof ForeignKeyBuilder) && !(fkRel instanceof RelationKeyBuilder)) {
        throw new Error(
          `Invalid relation target: ${table.meta.name}.${relName}이 참조하는 ` +
            `'${fkRelName}'이(가) ${targetTable.meta.name}의 유효한 ForeignKey/RelationKey가 아닙니다.`,
        );
      }
    }
  }
}

/**
 * 테이블 없음 에러인지 확인
 *
 * DBMS별 에러 코드/메시지 패턴:
 * - MySQL: errno 1146 (ER_NO_SUCH_TABLE), "Table 'xxx' doesn't exist"
 * - MSSQL: number 208, "Invalid object name 'xxx'"
 * - PostgreSQL: code "42P01", "relation \"xxx\" does not exist"
 */
function isTableNotExistsError(err: unknown): boolean {
  if (err == null) return false;

  // 에러 코드로 우선 확인 (다국어 환경에서도 안정적)
  const errObj = err as Record<string, unknown>;
  if (errObj["errno"] === 1146) return true; // MySQL ER_NO_SUCH_TABLE
  if (errObj["number"] === 208) return true; // MSSQL
  if (errObj["code"] === "42P01") return true; // PostgreSQL

  // 폴백: 메시지 매칭 (다국어 환경에서 불안정할 수 있음)
  const message = err instanceof Error ? err.message : String(err);
  const lowerMessage = message.toLowerCase();

  // MySQL: Table 'xxx' doesn't exist
  if (lowerMessage.includes("doesn't exist") && lowerMessage.includes("table")) {
    return true;
  }

  // MSSQL: Invalid object name 'xxx'
  if (lowerMessage.includes("invalid object name")) {
    return true;
  }

  // PostgreSQL: relation "xxx" does not exist
  if (lowerMessage.includes("does not exist") && lowerMessage.includes("relation")) {
    return true;
  }

  return false;
}
