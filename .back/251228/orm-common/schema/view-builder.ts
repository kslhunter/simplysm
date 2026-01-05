import { DbContext } from "../db-context";
import type { ColumnBuilderRecord } from "./column-builder";

// ============================================
// ViewBuilder
// ============================================

export class ViewBuilder<
  TData extends DataRecord,
  TColumnDefs extends ColumnBuilderRecord | never = never,
> {
  // SELECT용 - TData 기반 (query 또는 columns에서)
  readonly $infer!: TData;

  // CUD용 - TColumnDefs 기반 (columns 있을 때만)
  readonly $inferColumns!: TColumnDefs extends ColumnBuilderRecord
    ? InferColumns<TColumnDefs>
    : never;
  readonly $inferInsert!: TColumnDefs extends ColumnBuilderRecord
    ? InferInsertColumns<TColumnDefs>
    : never;
  readonly $inferUpdate!: TColumnDefs extends ColumnBuilderRecord
    ? InferUpdateColumns<TColumnDefs>
    : never;

  constructor(
    private readonly _meta: {
      name: string;
      description?: string;
      database?: string;
      schema?: string;
      viewFn?: (db: DbContext) => Queryable<TData>;
      columns?: TColumnDefs;
    },
  ) {}

  description(desc: string) {
    return new ViewBuilder<TData, TColumnDefs>({
      ...this._meta,
      description: desc,
    });
  }

  database(db: string) {
    return new ViewBuilder<TData, TColumnDefs>({
      ...this._meta,
      database: db,
    });
  }

  schema(schema: string) {
    return new ViewBuilder<TData, TColumnDefs>({
      ...this._meta,
      schema,
    });
  }

  /**
   * View의 쿼리 정의 (SELECT용)
   */
  query<TViewData extends DataRecord>(viewFn: (db: DbContext) => Queryable<TViewData>) {
    return new ViewBuilder<TViewData, TColumnDefs>({
      ...this._meta,
      viewFn,
    } as any);
  }

  /**
   * View의 컬럼 정의 (CUD용, DB First용)
   * - query 없이 columns만: DB First View (SELECT/CUD 모두 가능)
   * - query + columns: query로 SELECT, columns로 CUD
   */
  columns<T extends ColumnBuilderRecord>(cols: T) {
    // query가 없으면 columns에서 TData 추론
    type NewTData = TData extends Record<string, never> ? InferColumns<T> : TData;
    return new ViewBuilder<NewTData, T>({
      ...this._meta,
      columns: cols,
    } as any);
  }

  get meta() {
    return this._meta;
  }
}

// ============================================
// View 팩토리 함수
// ============================================

export function View(name: string) {
  return new ViewBuilder<{}, never>({ name });
}
