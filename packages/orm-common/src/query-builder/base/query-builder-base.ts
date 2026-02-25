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
 * QueryDef → SQL Render 추상 기본 class
 *
 * Base 원칙:
 * - 100% 모든 dialect가 동일한 로직만 구현 (dispatch)
 * - 조금이라도 다르면 전부 abstract
 * - Method명은 def.type과 동일 (동적 dispatch 가능)
 */
export abstract class QueryBuilderBase {
  protected abstract expr: ExprRendererBase;

  //#region ========== Dispatch (100% 동일) ==========

  build(def: QueryDef): QueryBuildResult {
    const method = this[def.type as keyof this];
    if (typeof method !== "function") {
      throw new Error(`Unknown QueryDef type: ${def.type}`);
    }
    return (method as (d: QueryDef) => QueryBuildResult).call(this, def);
  }

  /** SQL을 QueryBuildResult로 래핑하는 헬퍼 */
  protected result(sql: string, resultSetIndex?: number): QueryBuildResult {
    return resultSetIndex != null ? { sql, resultSetIndex } : { sql };
  }

  //#endregion

  //#region ========== 공통 Render method (100% 동일) ==========

  /** Table명 Render (dialect별로 다르므로 abstract) */
  protected abstract tableName(obj: QueryDefObjectName): string;

  /** WHERE 절 Render */
  protected renderWhere(wheres: WhereExpr[] | undefined): string {
    if (wheres == null || wheres.length === 0) return "";
    return ` WHERE ${this.expr.renderWhere(wheres)}`;
  }

  /** ORDER BY 절 Render */
  protected renderOrderBy(orderBy: [Expr, ("ASC" | "DESC")?][] | undefined): string {
    if (orderBy == null || orderBy.length === 0) return "";
    const parts = orderBy.map(
      ([e, dir]) => `${this.expr.render(e)}${dir != null ? ` ${dir}` : ""}`,
    );
    return ` ORDER BY ${parts.join(", ")}`;
  }

  /** GROUP BY 절 Render */
  protected renderGroupBy(groupBy: Expr[] | undefined): string {
    if (groupBy == null || groupBy.length === 0) return "";
    return ` GROUP BY ${groupBy.map((g) => this.expr.render(g)).join(", ")}`;
  }

  /** HAVING 절 Render */
  protected renderHaving(having: WhereExpr[] | undefined): string {
    if (having == null || having.length === 0) return "";
    return ` HAVING ${this.expr.renderWhere(having)}`;
  }

  /** JOIN 절 Render */
  protected renderJoins(joins: SelectQueryDefJoin[] | undefined): string {
    if (joins == null || joins.length === 0) return "";
    return joins.map((j) => this.renderJoin(j)).join("");
  }

  /** 단일 JOIN Render (dialect별로 다르므로 abstract) */
  protected abstract renderJoin(join: SelectQueryDefJoin): string;

  /**
   * JOIN이 LATERAL/CROSS APPLY가 필요한지 감지
   *
   * 기본 JOIN 속성(type, from, as, where, isSingle)만 있으면 일반 JOIN으로 처리.
   * 그 외 속성이 있으면 Subquery가 필요하므로 LATERAL JOIN 사용:
   *
   * - select: 컬럼 가공/집계가 필요 (일반 JOIN은 Table 전체를 참조)
   * - joins: 중첩 JOIN을 Subquery 내부에서 처리
   * - orderBy, top, limit: sorting/제한을 Subquery 내부에서 apply
   * - groupBy, having: 집계를 Subquery 내부에서 수행
   * - distinct: 중복 제거를 Subquery 내부에서 apply
   * - from (array): UNION ALL pattern
   *
   * 주의: select와 joins는 중첩 join 시 automatic 생성되므로 basicJoinProps에 포함하지 않음.
   * 사용자가 직접 .select()를 호출하지 않아도 내부 .joinSingle() 호출로 인해
   * select/joins가 추가될 수 있으며, 이 경우에도 Subquery가 필요함.
   */
  protected needsLateral(join: SelectQueryDefJoin): boolean {
    // from이 배열이면 무조건 LATERAL (UNION ALL Pattern)
    if (Array.isArray(join.from)) {
      return true;
    }

    // join 자체에 기본 JOIN property 외의 Add 속성이 있으면 LATERAL 필요
    const basicJoinProps = ["type", "from", "as", "where", "isSingle"];
    return Object.keys(join).some((key) => !basicJoinProps.includes(key));
  }

  /** FROM 절 소스 Render */
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
