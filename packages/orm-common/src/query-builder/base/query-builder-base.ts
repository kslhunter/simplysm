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
  AddPrimaryKeyQueryDef,
  DropPrimaryKeyQueryDef,
  AddForeignKeyQueryDef,
  DropForeignKeyQueryDef,
  AddIndexQueryDef,
  DropIndexQueryDef,
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
 * QueryDef → SQL 렌더링 추상 기본 클래스
 *
 * 기본 원칙:
 * - 모든 dialect에서 100% 동일한 로직만 구현 (dispatch)
 * - 조금이라도 다르면 abstract로 처리
 * - 메서드 이름이 def.type과 동일 (동적 dispatch 가능)
 */
/** 기본(비 LATERAL) JOIN의 속성 목록 */
const BASIC_JOIN_PROPS: ReadonlySet<string> = new Set<
  keyof Pick<SelectQueryDefJoin, "type" | "from" | "as" | "where" | "isSingle">
>(["type", "from", "as", "where", "isSingle"]);

export abstract class QueryBuilderBase {
  protected abstract expr: ExprRendererBase;

  //#region ========== Dispatch (100% 동일) ==========

  build(def: QueryDef): QueryBuildResult {
    const method = this[def.type as keyof this];
    if (typeof method !== "function") {
      throw new Error(`알 수 없는 QueryDef 타입: ${def.type}`);
    }
    return (method as (d: QueryDef) => QueryBuildResult).call(this, def);
  }

  /** SQL을 QueryBuildResult로 래핑하는 헬퍼 */
  protected result(sql: string, resultSetIndex?: number): QueryBuildResult {
    return resultSetIndex != null ? { sql, resultSetIndex } : { sql };
  }

  //#endregion

  //#region ========== 공통 렌더링 메서드 (100% 동일) ==========

  /** 테이블명 렌더링 (dialect마다 다르므로 abstract) */
  protected abstract tableName(obj: QueryDefObjectName): string;

  /** WHERE 절 렌더링 */
  protected renderWhere(wheres: WhereExpr[] | undefined): string {
    if (wheres == null || wheres.length === 0) return "";
    return ` WHERE ${this.expr.renderWhere(wheres)}`;
  }

  /** ORDER BY 절 렌더링 */
  protected renderOrderBy(orderBy: [Expr, ("ASC" | "DESC")?][] | undefined): string {
    if (orderBy == null || orderBy.length === 0) return "";
    const parts = orderBy.map(
      ([e, dir]) => `${this.expr.render(e)}${dir != null ? ` ${dir}` : ""}`,
    );
    return ` ORDER BY ${parts.join(", ")}`;
  }

  /** GROUP BY 절 렌더링 */
  protected renderGroupBy(groupBy: Expr[] | undefined): string {
    if (groupBy == null || groupBy.length === 0) return "";
    return ` GROUP BY ${groupBy.map((g) => this.expr.render(g)).join(", ")}`;
  }

  /** HAVING 절 렌더링 */
  protected renderHaving(having: WhereExpr[] | undefined): string {
    if (having == null || having.length === 0) return "";
    return ` HAVING ${this.expr.renderWhere(having)}`;
  }

  /** JOIN 절 렌더링 */
  protected renderJoins(joins: SelectQueryDefJoin[] | undefined): string {
    if (joins == null || joins.length === 0) return "";
    return joins.map((j) => this.renderJoin(j)).join("");
  }

  /** 단일 JOIN 렌더링 (dialect마다 다르므로 abstract) */
  protected abstract renderJoin(join: SelectQueryDefJoin): string;

  /**
   * JOIN에 LATERAL/CROSS APPLY가 필요한지 감지
   *
   * JOIN이 기본 속성(type, from, as, where, isSingle)만 가지면 일반 JOIN으로 처리.
   * 그 외의 경우 서브쿼리가 필요하므로 LATERAL JOIN 사용:
   *
   * - select: column 변환/집계가 필요 (일반 JOIN은 전체 테이블 참조)
   * - joins: 중첩 JOIN은 서브쿼리 내부에서 처리
   * - orderBy, top, limit: 정렬/제한은 서브쿼리 내부에서 적용
   * - groupBy, having: 집계는 서브쿼리 내부에서 수행
   * - distinct: 중복 제거는 서브쿼리 내부에서 적용
   * - from (array): UNION ALL 패턴
   *
   * 참고: select와 joins는 중첩 join 시 자동 생성되므로 basicJoinProps에 없음.
   * 사용자가 직접 .select()를 호출하지 않더라도 내부 .joinSingle()이
   * select/joins를 추가할 수 있으며, 이 경우에도 서브쿼리가 필요함.
   */
  protected needsLateral(join: SelectQueryDefJoin): boolean {
    // from이 배열이면 항상 LATERAL (UNION ALL 패턴)
    if (Array.isArray(join.from)) {
      return true;
    }

    // 기본 JOIN 속성 외 추가 속성이 있으면 LATERAL 필요
    return Object.keys(join).some((key) => !BASIC_JOIN_PROPS.has(key));
  }

  /**
   * recursive() 내부에서 생성되는 self 참조 JOIN 감지
   *
   * RecursiveQueryable이 현재 CTE를 `...self` 별칭으로 다시 붙일 때만 사용된다.
   * 이 경우 OUTER JOIN이 아니라 CROSS JOIN이어야 DB별 재귀 CTE 제약을 피할 수 있다.
   */
  protected isRecursiveSelfJoin(join: SelectQueryDefJoin): boolean {
    return typeof join.from === "string" && join.as.endsWith(".self");
  }

  /** FROM 절 소스 렌더링 */
  protected renderFrom(from: SelectQueryDef["from"]): string {
    if (from == null) {
      throw new Error("FROM 절이 필요합니다.");
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

  protected abstract addPrimaryKey(def: AddPrimaryKeyQueryDef): QueryBuildResult;
  protected abstract dropPrimaryKey(def: DropPrimaryKeyQueryDef): QueryBuildResult;
  protected abstract addForeignKey(def: AddForeignKeyQueryDef): QueryBuildResult;
  protected abstract dropForeignKey(def: DropForeignKeyQueryDef): QueryBuildResult;
  protected abstract addIndex(def: AddIndexQueryDef): QueryBuildResult;
  protected abstract dropIndex(def: DropIndexQueryDef): QueryBuildResult;

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
