import type {
  QueryDef,
  SelectQueryDef,
  InsertQueryDef,
  InsertIfNotExistsQueryDef,
  InsertIntoQueryDef,
  UpdateQueryDef,
  DeleteQueryDef,
  UpsertQueryDef,
  CreateTableQueryDef,
  DropTableQueryDef,
  RenameTableQueryDef,
  TruncateQueryDef,
  AddColumnQueryDef,
  DropColumnQueryDef,
  ModifyColumnQueryDef,
  RenameColumnQueryDef,
  AddPkQueryDef,
  DropPkQueryDef,
  AddFkQueryDef,
  DropFkQueryDef,
  AddIdxQueryDef,
  DropIdxQueryDef,
  CreateViewQueryDef,
  DropViewQueryDef,
  CreateProcQueryDef,
  DropProcQueryDef,
  ExecProcQueryDef,
  ClearSchemaQueryDef,
  SchemaExistsQueryDef,
  SwitchFkQueryDef,
  SelectQueryDefJoin,
  QueryDefObjectName,
} from "../../types/query-def";
import type { Expr, WhereExpr } from "../../types/expr";
import type { QueryBuildResult } from "../../types/db";
import type { ExprRendererBase } from "./expr-renderer-base";

/**
 * QueryDef → SQL render abstract base class
 *
 * Base principles:
 * - Implement only 100% identical logic across all dialects (dispatch)
 * - If different at all, make it abstract
 * - Method name identical to def.type (enables dynamic dispatch)
 */
export abstract class QueryBuilderBase {
  protected abstract expr: ExprRendererBase;

  //#region ========== Dispatch (100% identical) ==========

  build(def: QueryDef): QueryBuildResult {
    const method = this[def.type as keyof this];
    if (typeof method !== "function") {
      throw new Error(`Unknown QueryDef type: ${def.type}`);
    }
    return (method as (d: QueryDef) => QueryBuildResult).call(this, def);
  }

  /** Helper to wrap SQL in QueryBuildResult */
  protected result(sql: string, resultSetIndex?: number): QueryBuildResult {
    return resultSetIndex != null ? { sql, resultSetIndex } : { sql };
  }

  //#endregion

  //#region ========== Common render method (100% identical) ==========

  /** Table name render (different per dialect, so abstract) */
  protected abstract tableName(obj: QueryDefObjectName): string;

  /** WHERE clause render */
  protected renderWhere(wheres: WhereExpr[] | undefined): string {
    if (wheres == null || wheres.length === 0) return "";
    return ` WHERE ${this.expr.renderWhere(wheres)}`;
  }

  /** ORDER BY clause render */
  protected renderOrderBy(orderBy: [Expr, ("ASC" | "DESC")?][] | undefined): string {
    if (orderBy == null || orderBy.length === 0) return "";
    const parts = orderBy.map(
      ([e, dir]) => `${this.expr.render(e)}${dir != null ? ` ${dir}` : ""}`,
    );
    return ` ORDER BY ${parts.join(", ")}`;
  }

  /** GROUP BY clause render */
  protected renderGroupBy(groupBy: Expr[] | undefined): string {
    if (groupBy == null || groupBy.length === 0) return "";
    return ` GROUP BY ${groupBy.map((g) => this.expr.render(g)).join(", ")}`;
  }

  /** HAVING clause render */
  protected renderHaving(having: WhereExpr[] | undefined): string {
    if (having == null || having.length === 0) return "";
    return ` HAVING ${this.expr.renderWhere(having)}`;
  }

  /** JOIN clause render */
  protected renderJoins(joins: SelectQueryDefJoin[] | undefined): string {
    if (joins == null || joins.length === 0) return "";
    return joins.map((j) => this.renderJoin(j)).join("");
  }

  /** Single JOIN render (different per dialect, so abstract) */
  protected abstract renderJoin(join: SelectQueryDefJoin): string;

  /**
   * Detect if JOIN needs LATERAL/CROSS APPLY
   *
   * If JOIN has only basic properties (type, from, as, where, isSingle), treat as normal JOIN.
   * Otherwise, subquery is needed, so use LATERAL JOIN:
   *
   * - select: column transformation/aggregation needed (normal JOIN references entire table)
   * - joins: nested JOIN handled inside subquery
   * - orderBy, top, limit: sorting/limit applied inside subquery
   * - groupBy, having: aggregation performed inside subquery
   * - distinct: deduplication applied inside subquery
   * - from (array): UNION ALL pattern
   *
   * Note: select and joins are auto-generated during nested joins, so not in basicJoinProps.
   * Even if user doesn't call .select() directly, internal .joinSingle() may add
   * select/joins, which also requires subquery.
   */
  protected needsLateral(join: SelectQueryDefJoin): boolean {
    // If from is array, always LATERAL (UNION ALL pattern)
    if (Array.isArray(join.from)) {
      return true;
    }

    // LATERAL needed if join has additional properties beyond basic JOIN properties
    const basicJoinProps = ["type", "from", "as", "where", "isSingle"];
    return Object.keys(join).some((key) => !basicJoinProps.includes(key));
  }

  /** FROM clause source render */
  protected renderFrom(from: SelectQueryDef["from"]): string {
    if (from == null) {
      throw new Error("FROM clause is required.");
    }
    if (typeof from === "string") {
      return this.expr.wrap(from);
    }
    if ("type" in from) {
      return `(${this.select(from).sql})`;
    }
    if (Array.isArray(from)) {
      return `(${from.map((f) => this.select(f).sql).join(" UNION ALL ")})`;
    }
    return this.tableName(from);
  }

  //#endregion

  //#region ========== Abstract - DML ==========

  protected abstract select(def: SelectQueryDef): QueryBuildResult;
  protected abstract insert(def: InsertQueryDef): QueryBuildResult;
  protected abstract insertIfNotExists(def: InsertIfNotExistsQueryDef): QueryBuildResult;
  protected abstract insertInto(def: InsertIntoQueryDef): QueryBuildResult;
  protected abstract update(def: UpdateQueryDef): QueryBuildResult;
  protected abstract delete(def: DeleteQueryDef): QueryBuildResult;
  protected abstract upsert(def: UpsertQueryDef): QueryBuildResult;

  //#endregion

  //#region ========== Abstract - DDL Table ==========

  protected abstract createTable(def: CreateTableQueryDef): QueryBuildResult;
  protected abstract dropTable(def: DropTableQueryDef): QueryBuildResult;
  protected abstract renameTable(def: RenameTableQueryDef): QueryBuildResult;
  protected abstract truncate(def: TruncateQueryDef): QueryBuildResult;

  //#endregion

  //#region ========== Abstract - DDL Column ==========

  protected abstract addColumn(def: AddColumnQueryDef): QueryBuildResult;
  protected abstract dropColumn(def: DropColumnQueryDef): QueryBuildResult;
  protected abstract modifyColumn(def: ModifyColumnQueryDef): QueryBuildResult;
  protected abstract renameColumn(def: RenameColumnQueryDef): QueryBuildResult;

  //#endregion

  //#region ========== Abstract - DDL Constraint ==========

  protected abstract addPk(def: AddPkQueryDef): QueryBuildResult;
  protected abstract dropPk(def: DropPkQueryDef): QueryBuildResult;
  protected abstract addFk(def: AddFkQueryDef): QueryBuildResult;
  protected abstract dropFk(def: DropFkQueryDef): QueryBuildResult;
  protected abstract addIdx(def: AddIdxQueryDef): QueryBuildResult;
  protected abstract dropIdx(def: DropIdxQueryDef): QueryBuildResult;

  //#endregion

  //#region ========== Abstract - DDL View/Procedure ==========

  protected abstract createView(def: CreateViewQueryDef): QueryBuildResult;
  protected abstract dropView(def: DropViewQueryDef): QueryBuildResult;
  protected abstract createProc(def: CreateProcQueryDef): QueryBuildResult;
  protected abstract dropProc(def: DropProcQueryDef): QueryBuildResult;
  protected abstract execProc(def: ExecProcQueryDef): QueryBuildResult;

  //#endregion

  //#region ========== Abstract - Utils ==========

  protected abstract clearSchema(def: ClearSchemaQueryDef): QueryBuildResult;
  protected abstract schemaExists(def: SchemaExistsQueryDef): QueryBuildResult;
  protected abstract switchFk(def: SwitchFkQueryDef): QueryBuildResult;

  //#endregion
}
