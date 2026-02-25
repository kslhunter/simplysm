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
 * Code First Database Initialize
 *
 * Creates Tables/Views/Procedures defined in DbContext to Database and
 * applies migrations
 *
 * @param db - DbContext instance
 * @param def - DbContext definition
 * @param options - Initialize options
 * @param options.dbs - List of target Databases for initialize (current database if not specified)
 * @param options.force - If true, delete existing schema and recreate all
 * @throws {Error} When there is no Database to initialize
 * @throws {Error} When the specified Database does not exist
 *
 * Behavior:
 * - **force=true**: clearSchema → create all → register all migrations as "applied"
 * - **force=false** (default):
 *   - No _Migration Table: create all + register all migrations
 *   - _Migration Table exists: execute only unapplied migrations
 */
export async function initialize(
  db: DbContextBase & DbContextDdlMethods & { _migration: () => Queryable<{ code: string }, any> },
  def: DbContextDef<any, any, any>,
  options?: { dbs?: string[]; force?: boolean },
): Promise<void> {
  const dbNames = options?.dbs ?? (db.database !== undefined ? [db.database] : []);
  if (dbNames.length < 1) {
    throw new Error("No Database to initialize.");
  }

  const force = options?.force ?? false;

  // 1. DB 존재 확인
  for (const dbName of dbNames) {
    const schemaExistsDef = getSchemaExistsQueryDef(dbName, db.schema);
    const result = await db.executeDefs([schemaExistsDef]);
    const schemaExists = result[0].length > 0;
    if (!schemaExists) {
      throw new Error(`Database '${dbName}' does not exist.`);
    }
  }

  if (force) {
    // 2. force: dbs 전체 Initialize
    for (const dbName of dbNames) {
      const clearDef = getClearSchemaQueryDef({ database: dbName, schema: db.schema });
      await db.executeDefs([clearDef]);
    }
    await createAllObjects(db, def);

    // Register all migrations as "applied"
    if (def.meta.migrations.length > 0) {
      await db._migration().insert(def.meta.migrations.map((m) => ({ code: m.name })));
    }
  } else {
    // 3. Migration 기반 Initialize
    let appliedMigrations: { code: string }[] | undefined;
    try {
      appliedMigrations = await db._migration().result();
    } catch (err) {
      // No Table = new environment
      if (!isTableNotExistsError(err)) {
        throw err;
      }
    }

    if (appliedMigrations == null) {
      // New environment: create all
      await createAllObjects(db, def);

      // Register all migrations as "applied"
      if (def.meta.migrations.length > 0) {
        await db._migration().insert(def.meta.migrations.map((m) => ({ code: m.name })));
      }
    } else {
      // Existing environment: execute only unapplied migrations
      const appliedCodes = new Set(appliedMigrations.map((m) => m.code));
      const pendingMigrations = def.meta.migrations.filter((m) => !appliedCodes.has(m.name));

      for (const migration of pendingMigrations) {
        await migration.up(db);
        await db._migration().insert([{ code: migration.name }]);
      }
    }
  }
}

/**
 * 전체 object Generate (table/View/Procedure/FK/Index)
 */
async function createAllObjects(
  db: DbContextBase,
  def: DbContextDef<any, any, any>,
): Promise<void> {
  // 1. Table/View/Procedure Generate
  const builders = getBuilders(def);
  const createDefs: QueryDef[] = [];
  for (const builder of builders) {
    createDefs.push(getCreateObjectQueryDef(db, builder));
  }
  if (createDefs.length > 0) {
    await db.executeDefs(createDefs);
  }

  // 2. FK Generate (TableBuilder만)
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

  // 3. Index Generate (TableBuilder만)
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
  const builders: (
    | TableBuilder<any, any>
    | ViewBuilder<any, any, any>
    | ProcedureBuilder<any, any>
  )[] = [];

  // Tables
  const tables: TableBuilder<any, any>[] = Object.values(def.meta.tables);
  for (const table of tables) {
    builders.push(table);
  }

  // Views
  const views: ViewBuilder<any, any, any>[] = Object.values(def.meta.views);
  for (const view of views) {
    builders.push(view);
  }

  // Procedures
  const procs: ProcedureBuilder<any, any>[] = Object.values(def.meta.procedures);
  for (const proc of procs) {
    builders.push(proc);
  }

  return builders;
}

/**
 * ForeignKeyTarget/RelationKeyTarget 관계의 유효성 Validation
 * - targetTableFn()이 반환하는 Table에 relationName에 해당하는 FK/RelationKey가 있는지 확인
 */
export function validateRelations(def: DbContextDef<any, any, any>): void {
  const builders = getBuilders(def);
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
          `Invalid relation target: ${table.meta.name}.${relName}이 참조하는 ` +
            `'${fkRelName}'이(가) ${targetTable.meta.name}의 유효한 ForeignKey/RelationKey가 아닙니다.`,
        );
      }
    }
  }
}

/**
 * Table N/A 에러인지 확인
 *
 * DBMS별 error code/메시지 pattern:
 * - MySQL: errno 1146 (ER_NO_SUCH_TABLE), "Table 'xxx' doesn't exist"
 * - MSSQL: number 208, "Invalid object name 'xxx'"
 * - PostgreSQL: code "42P01", "relation \"xxx\" does not exist"
 */
function isTableNotExistsError(err: unknown): boolean {
  if (err == null) return false;

  // error code로 우선 확인 (multilingual 환경에서도 안정적)
  const errObj = err as Record<string, unknown>;
  if (errObj["errno"] === 1146) return true; // MySQL ER_NO_SUCH_TABLE
  if (errObj["number"] === 208) return true; // MSSQL
  if (errObj["code"] === "42P01") return true; // PostgreSQL

  // 폴백: 메시지 매칭 (multilingual 환경에서 불안정할 수 있음)
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
