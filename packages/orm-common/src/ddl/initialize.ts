import type { DbContextBase, DbContextDdlMethods } from "../types/db-context-def";
import type { Queryable } from "../exec/queryable";
import type { QueryDef } from "../types/query-def";
import type { Migration } from "../types/db";
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
import { getAddForeignKeyQueryDef, getAddIndexQueryDef } from "./relation-ddl";
import { getClearSchemaQueryDef, getSchemaExistsQueryDef } from "./schema-ddl";
import { SD_BUILDER } from "../db-context";

/**
 * Code First 데이터베이스 초기화
 *
 * DbContext에 정의된 Table/View/Procedure를 데이터베이스에 생성하고
 * migration을 적용한다
 *
 * @param db - DbContext 인스턴스
 * @param def - DbContext 정의
 * @param options - 초기화 옵션
 * @param options.dbs - 초기화 대상 데이터베이스 목록 (미지정 시 현재 데이터베이스)
 * @param options.force - true이면 기존 schema를 삭제하고 모두 재생성
 * @throws {Error} 초기화할 데이터베이스가 없을 때
 * @throws {Error} 지정된 데이터베이스가 존재하지 않을 때
 *
 * 동작:
 * - **force=true**: clearSchema → 전체 생성 → 모든 migration을 "적용됨"으로 등록
 * - **force=false** (기본값):
 *   - _Migration 테이블 없음: 전체 생성 + 모든 migration 등록
 *   - _Migration 테이블 있음: 미적용 migration만 실행
 */
export async function initialize(
  db: DbContextBase &
    DbContextDdlMethods & {
      _migration: () => Queryable<{ code: string }, any>;
      migrations: Migration[];
    },
  options?: { dbs?: string[]; force?: boolean },
): Promise<void> {
  const dbNames = options?.dbs ?? (db.database !== undefined ? [db.database] : []);
  if (dbNames.length < 1) {
    throw new Error("초기화할 데이터베이스가 없습니다.");
  }

  const force = options?.force ?? false;
  const builders = collectBuilders(db);
  const migrations = db.migrations;

  // 1. DB 존재 여부 확인
  for (const dbName of dbNames) {
    const schemaExistsDef = getSchemaExistsQueryDef(dbName, db.schema);
    const result = await db.executeDefs([schemaExistsDef]);
    const schemaExists = result[0].length > 0;
    if (!schemaExists) {
      throw new Error(`데이터베이스 '${dbName}'이(가) 존재하지 않습니다.`);
    }
  }

  if (force) {
    // 2. force: 모든 DB 초기화
    for (const dbName of dbNames) {
      const clearDef = getClearSchemaQueryDef({ database: dbName, schema: db.schema });
      await db.executeDefs([clearDef]);
    }

    // 각 대상 DB에 객체 생성
    for (const dbName of dbNames) {
      await createAllObjects(db, builders, dbName);
    }

    // 모든 migration을 "적용됨"으로 등록
    if (migrations.length > 0) {
      await db._migration().insert(migrations.map((m) => ({ code: m.name })));
    }
  } else {
    // 3. Migration 기반 초기화 — 각 대상 DB에 대해 수행
    let appliedMigrations: { code: string }[] | undefined;
    try {
      appliedMigrations = await db._migration().execute();
    } catch (err) {
      // 테이블 없음 = 새 환경
      if (!isTableNotExistsError(err)) {
        throw err;
      }
    }

    if (appliedMigrations == null) {
      // 새 환경: 각 대상 DB에 전체 생성
      for (const dbName of dbNames) {
        await createAllObjects(db, builders, dbName);
      }

      // 모든 migration을 "적용됨"으로 등록
      if (migrations.length > 0) {
        await db._migration().insert(migrations.map((m) => ({ code: m.name })));
      }
    } else {
      // 기존 환경: 미적용 migration만 실행
      const appliedCodes = new Set(appliedMigrations.map((m) => m.code));
      const pendingMigrations = migrations.filter((m) => !appliedCodes.has(m.name));

      for (const migration of pendingMigrations) {
        await migration.up(db);
        await db._migration().insert([{ code: migration.name }]);
      }
    }
  }
}

/**
 * 모든 객체 생성 (table/view/procedure/FK/index)
 *
 * @param db - DbContext 인스턴스
 * @param builders - 생성할 builder 목록
 * @param targetDatabase - 대상 데이터베이스. builder에 database가 지정된 경우 해당 builder의 database가 targetDatabase와
 *   일치할 때만 생성한다. 미지정 builder는 targetDatabase에 생성한다.
 */
async function createAllObjects(
  db: DbContextBase,
  builders: (TableBuilder<any, any> | ViewBuilder<any, any, any> | ProcedureBuilder<any, any>)[],
  targetDatabase: string,
): Promise<void> {
  // targetDatabase에 해당하는 builder만 필터링
  const targetBuilders = builders.filter((b) => {
    const builderDb = b.meta.database;
    return builderDb == null || builderDb === targetDatabase;
  });

  // 1. Table/View/Procedure 생성
  const createDefs: QueryDef[] = [];
  for (const builder of targetBuilders) {
    createDefs.push(getCreateObjectQueryDef(db, builder));
  }
  if (createDefs.length > 0) {
    await db.executeDefs(createDefs);
  }

  // 2. FK 생성 (TableBuilder만)
  const tables = targetBuilders.filter((b) => b instanceof TableBuilder);
  const addFkDefs: QueryDef[] = [];
  for (const table of tables) {
    const relations = table.meta.relations;
    if (relations == null) continue;

    const tableDef = db.getQueryDefObjectName(table);
    for (const [relationName, relationDef] of Object.entries(relations)) {
      if (!(relationDef instanceof ForeignKeyBuilder)) continue;

      addFkDefs.push(getAddForeignKeyQueryDef(db, tableDef, relationName, relationDef));
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
      createIndexDefs.push(getAddIndexQueryDef(indexTableDef, indexBuilder));
    }
  }
  if (createIndexDefs.length > 0) {
    await db.executeDefs(createIndexDefs);
  }
}

/**
 * DbContext 인스턴스에서 SD_BUILDER 태그가 붙은 builder를 수집
 */
function collectBuilders(
  dbContext: object,
): (TableBuilder<any, any> | ViewBuilder<any, any, any> | ProcedureBuilder<any, any>)[] {
  const builders: (
    | TableBuilder<any, any>
    | ViewBuilder<any, any, any>
    | ProcedureBuilder<any, any>
  )[] = [];

  for (const value of Object.values(dbContext)) {
    if (typeof value === "function" && SD_BUILDER in value) {
      builders.push(value[SD_BUILDER as keyof typeof value] as TableBuilder<any, any>);
    }
  }

  return builders;
}

/**
 * ForeignKeyTarget/RelationKeyTarget 관계 검증
 * - targetTableFn()이 반환하는 테이블에 relationName과 일치하는 FK/RelationKey가 있는지 확인
 */
export function validateRelations(dbContext: object): void {
  const builders = collectBuilders(dbContext);
  const tables = builders.filter((b) => b instanceof TableBuilder);

  for (const table of tables) {
    const relations = table.meta.relations;
    if (relations == null) continue;

    for (const [relName, relDef] of Object.entries(relations)) {
      if (
        !(relDef instanceof ForeignKeyTargetBuilder) &&
        !(relDef instanceof RelationKeyTargetBuilder)
      ) {
        continue;
      }

      const targetTable = relDef.meta.targetTableFn();
      const fkRelName = relDef.meta.relationName;
      const fkRel = targetTable.meta.relations?.[fkRelName];

      if (!(fkRel instanceof ForeignKeyBuilder) && !(fkRel instanceof RelationKeyBuilder)) {
        throw new Error(
          `유효하지 않은 관계 대상: ${table.meta.name}.${relName}이(가) 참조하는 '${fkRelName}'은(는) ` +
            `${targetTable.meta.name}에서 유효한 ForeignKey/RelationKey가 아닙니다.`,
        );
      }
    }
  }
}

/**
 * 오류가 테이블 미존재를 나타내는지 확인
 *
 * DBMS별 오류 코드/메시지 패턴:
 * - MySQL: errno 1146 (ER_NO_SUCH_TABLE), "Table 'xxx' doesn't exist"
 * - MSSQL: number 208, "Invalid object name 'xxx'"
 * - PostgreSQL: code "42P01", "relation \"xxx\" does not exist"
 */
function isTableNotExistsError(err: unknown): boolean {
  if (err == null) return false;

  // 오류 코드를 먼저 확인 (다국어 환경에서도 안정적)
  const errObj = err as Record<string, unknown>;
  if (errObj["errno"] === 1146) return true; // MySQL ER_NO_SUCH_TABLE
  if (errObj["number"] === 208) return true; // MSSQL
  if (errObj["code"] === "42P01") return true; // PostgreSQL

  // 폴백: 메시지 매칭 (다국어 환경에서는 신뢰할 수 없을 수 있음)
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
