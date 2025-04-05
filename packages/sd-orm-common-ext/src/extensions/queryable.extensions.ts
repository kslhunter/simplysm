import { DbContext, Queryable } from "@simplysm/sd-orm-common";
import { DateTime } from "@simplysm/sd-core-common";
import { SystemDataLog } from "../models/system-data-log";

declare module "@simplysm/sd-orm-common" {
  interface Queryable<D extends DbContext, T> {
    joinLastDataLog(opt?: { includeTypes?: string[]; excludeTypes?: string[] }): Queryable<D, T & {
      lastDataLog: IJoinDataLogItem
    }>;

    joinFirstDataLog(opt?: { includeTypes?: string[]; excludeTypes?: string[] }): Queryable<D, T & {
      firstDataLog: IJoinDataLogItem
    }>;

    insertDataLogAsync(log: IInsertDataLogParam): Promise<number[]>;

    insertDataLogPrepare(log: IInsertDataLogParam): void;
  }
}

((prototype) => {
  prototype.joinLastDataLog = function (this: Queryable<any, any>, opt?: {
    includeTypes?: string[];
    excludeTypes?: string[]
  }): Queryable<any, any> {
    return this.joinSingle(
      SystemDataLog,
      "lastDataLog",
      (qr, en) => qr
        .where((item) => [
          this.db.qh.equal(item.tableName, this.tableName),
          this.db.qh.equal(item.itemId, en["id"]),
          ...opt?.includeTypes ? [this.db.qh.in(item.type, opt.includeTypes)] : [],
          ...opt?.excludeTypes ? [this.db.qh.notIn(item.type, opt.excludeTypes)] : [],
        ])
        .orderBy((item) => item.tableName, true) //<-- MYSQL에서의 인덱싱을 위해 필요함
        .orderBy((item) => item.itemId, true) //<-- MYSQL에서의 인덱싱을 위해 필요함
        .orderBy((item) => item.dateTime, true)
        .top(1)
        .include(item => item.user)
        .select<IJoinDataLogItem>((item) => ({
          type: item.type,
          dateTime: item.dateTime,
          userId: item.userId,
          userName: item.user.name,
        })),
    );
  };

  prototype.joinFirstDataLog = function (this: Queryable<any, any>, opt?: {
    includeTypes?: string[];
    excludeTypes?: string[]
  }): Queryable<any, any> {
    return this.joinSingle(
      SystemDataLog,
      "firstDataLog",
      (qr, en) => qr
        .where((item) => [
          this.db.qh.equal(item.tableName, this.tableName),
          this.db.qh.equal(item.itemId, en["id"]),
          ...opt?.includeTypes ? [this.db.qh.in(item.type, opt.includeTypes)] : [],
          ...opt?.excludeTypes ? [this.db.qh.notIn(item.type, opt.excludeTypes)] : [],
        ])
        .orderBy((item) => item.tableName, true) //<-- MYSQL에서의 인덱싱을 위해 필요함
        .orderBy((item) => item.itemId, true) //<-- MYSQL에서의 인덱싱을 위해 필요함
        .orderBy((item) => item.dateTime, false)
        .top(1)
        .include(item => item.user)
        .select((item) => ({
          type: item.type,
          dateTime: item.dateTime,
          userId: item.userId,
          userName: item.user.name,
        })),
    );
  };

  prototype.insertDataLogAsync = async function (
    this: Queryable<any, any>,
    log: IInsertDataLogParam,
  ): Promise<number[]> {

    return (
      await this.db.systemDataLog.insertAsync([
        {
          tableName: this.tableName,
          tableDescription: this.tableDescription,
          type: log.type,
          itemId: log.itemId,
          valueJson: log.valueJson,
          dateTime: this.db.lastConnectionDateTime!,
          userId: log.userId,
        },
      ], ["id"])
    ).map(item => item.id!);
  };

  prototype.insertDataLogPrepare = function (this: Queryable<any, any>, log: IInsertDataLogParam) {
    this.db.dataLog.insertPrepare([
      {
        tableName: this.tableName,
        tableDescription: this.tableDescription,
        doneDateTime: this.db.lastConnectionDateTime!,
        ...log,
      },
    ]);
  };
})(Queryable.prototype);

export interface IInsertDataLogParam {
  type: string;
  itemId: number;
  valueJson?: string;
  userId?: number;
}

export interface IJoinDataLogItem {
  type?: string;
  dateTime?: DateTime;
  userId?: number;
  userName?: string;
}