import { DateTime } from "@simplysm/core-common";
import {
  type DataRecord,
  expr,
  Queryable,
  queryable,
  type TableBuilder,
} from "@simplysm/orm-common";
import { _DataLog } from "./tables/_DataLog";

// ── Type Declarations ──

export interface IDataLogJoinOptions {
  includeActions?: string[];
  excludeActions?: string[];
}

export interface IDataLogJoinResult {
  action?: string;
  dateTime?: DateTime;
  employeeId?: number;
  employeeName?: string;
}

export interface IInsertDataLogParam {
  action: string;
  itemId: number;
  employeeId?: number;
  valueJson?: string;
}

declare module "@simplysm/orm-common" {
  interface Queryable<TData extends DataRecord, TFrom extends TableBuilder<any, any> | never> {
    joinLastDataLog(
      opts?: IDataLogJoinOptions,
    ): Queryable<TData & { lastDataLog?: IDataLogJoinResult }, TFrom>;

    joinFirstDataLog(
      opts?: IDataLogJoinOptions,
    ): Queryable<TData & { firstDataLog?: IDataLogJoinResult }, TFrom>;

    insertDataLog(log: IInsertDataLogParam): Promise<void>;
  }
}

// ── Runtime: insertDataLog ──

Queryable.prototype.insertDataLog = async function (
  this: Queryable<any, any>,
  log: IInsertDataLogParam,
): Promise<void> {
  const tableName = (this.meta.from as TableBuilder<any, any>).meta.name;
  const dataLogQr = queryable(this.meta.db, _DataLog);

  await dataLogQr().insert([
    {
      tableName,
      action: log.action,
      itemId: log.itemId,
      valueJson: log.valueJson,
      dateTime: new DateTime(),
      employeeId: log.employeeId,
    },
  ]);
};

// ── Runtime: joinLastDataLog ──

Queryable.prototype.joinLastDataLog = function (
  this: Queryable<any, any>,
  opts?: IDataLogJoinOptions,
) {
  const tableName = (this.meta.from as TableBuilder<any, any>).meta.name;

  return this.joinSingle("lastDataLog", (qr, en) =>
    qr
      .from(_DataLog)
      .where((dl) => [
        expr.eq(dl.tableName, tableName),
        expr.eq(dl.itemId, en["id"]),
        ...(opts?.includeActions ? [expr.in(dl.action, opts.includeActions)] : []),
        ...(opts?.excludeActions ? [expr.not(expr.in(dl.action, opts.excludeActions))] : []),
      ])
      .orderBy((dl) => dl.tableName, "DESC")
      .orderBy((dl) => dl.itemId, "DESC")
      .orderBy((dl) => dl.dateTime, "DESC")
      .top(1)
      .include((dl) => dl.employee)
      .select((dl) => ({
        action: dl.action,
        dateTime: dl.dateTime,
        employeeId: dl.employeeId,
        employeeName: dl.employee!.name,
      })),
  );
};

// ── Runtime: joinFirstDataLog ──

Queryable.prototype.joinFirstDataLog = function (
  this: Queryable<any, any>,
  opts?: IDataLogJoinOptions,
) {
  const tableName = (this.meta.from as TableBuilder<any, any>).meta.name;

  return this.joinSingle("firstDataLog", (qr, en) =>
    qr
      .from(_DataLog)
      .where((dl) => [
        expr.eq(dl.tableName, tableName),
        expr.eq(dl.itemId, en["id"]),
        ...(opts?.includeActions ? [expr.in(dl.action, opts.includeActions)] : []),
        ...(opts?.excludeActions ? [expr.not(expr.in(dl.action, opts.excludeActions))] : []),
      ])
      .orderBy((dl) => dl.tableName, "ASC")
      .orderBy((dl) => dl.itemId, "ASC")
      .orderBy((dl) => dl.dateTime, "ASC")
      .top(1)
      .include((dl) => dl.employee)
      .select((dl) => ({
        action: dl.action,
        dateTime: dl.dateTime,
        employeeId: dl.employeeId,
        employeeName: dl.employee!.name,
      })),
  );
};
