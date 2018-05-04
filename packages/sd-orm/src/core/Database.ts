import * as fs from "fs-extra";
import {ConnectionPool, IProcedureResult, IResult, ISOLATION_LEVEL, ISqlType, Request, Table, Transaction} from "mssql";
import {Exception} from "../../../sd-core/src/exceptions/Exception";
import {Type} from "../../../sd-core/src/types/Type";
import {Logger} from "../../../sd-core/src/utils/Logger";
import {IFunctionDefinition, IStoredProcedureDefinition, ITableDefinition} from "../common/Definitions";
import {OrderByRule} from "../common/Enums";
import {functionMetadataSymbol} from "../common/FunctionDecorators";
import {IConnectionConfig} from "../common/IConnectionConfig";
import {storedProcedureMetadataSymbol} from "../common/StoredProcedureDecorators";
import {tableMetadataSymbol} from "../common/TableDecorators";
import {Queryable} from "./Queryable";
import {QueryableFunction} from "./QueryableFunction";
import {QueryableStoredProcedure} from "./QueryableStoredProcedure";
import {QueryBuilder} from "./QueryBuilder";

export abstract class Database {
  public static async connect<T extends Database, R>(dbContextType: Type<T>, fn: (dbContext: T) => Promise<R>): Promise<R> {
    return this._connectFn(dbContextType, async dbContext =>
      dbContext._transFn(async () =>
        fn(dbContext)));
  }

  private static async _connectFn<T extends Database, R>(dbContextType: Type<T>, fn: (dbContext: T) => Promise<R>): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      try {
        const dbContext = new dbContextType();

        dbContext._conn = new ConnectionPool({
          server: dbContext.config.host,
          port: dbContext.config.port,
          database: dbContext.config.database,
          user: dbContext.config.user,
          password: dbContext.config.password,
          options: {
            useUTC: false
          },
          pool: {
            max: 1,
            min: 0,
            evictionRunIntervalMillis: 500,
            idleTimeoutMillis: 500,
            testOnBorrow: true
          }
        });

        dbContext._conn.connect(err => {
          if (err) {
            reject(err);
            return;
          }

          fn(dbContext)
            .then(result => {
              dbContext._conn!.close(error => {
                if (error) {
                  reject(error);
                  return;
                }
                resolve(result);
              });
            })
            .catch(error => {
              try {
                dbContext._conn!.close(() => {
                  reject(error);
                });
              } catch (err) {
                reject(err);
              }
            });
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  public logger = new Logger("@simplism/sd-orm", "Database");

  private _conn?: ConnectionPool;
  private _trans?: Transaction;

  private _preparedQueries: string[] = [];

  public get hasTransaction(): boolean {
    return !!this._trans;
  }

  protected constructor(public config: IConnectionConfig,
                        public migrations: string[]) {
  }

  public unionAll<T>(args: Queryable<T>[]): Queryable<T> {
    return new Queryable<T>(this, undefined, args);
  }

  public async execute<T>(query: string): Promise<IResult<T>> {
    if (this.logger) {
      this.logger.log("EXECUTE QUERY:", query);
    }

    return new Promise<IResult<any>>((resolve, reject) => {
      try {
        const req = this._trans ? new Request(this._trans) : new Request(this._conn);
        req.query<T>(query, (err, result) => {
          if (err) {
            try {
              let errorMessage = `ERROR: ${err.message}\n`;

              if (err["precedingErrors"]) {
                for (const precedingError of err["precedingErrors"]) {
                  errorMessage += ` - ${precedingError.message}\n`;
                }
              }

              if (this.logger) {
                this.logger.error(errorMessage, query);
              }
              const exception = new Exception(errorMessage);
              exception.innerError = err;
              reject(exception);
            } catch (err) {
              reject(err);
              return;
            }
            return;
          }
          resolve(result);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  public async executeBulkInsert(table: Table): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        const req = this._trans ? new Request(this._trans) : new Request(this._conn);
        req.bulk(table, err => {
          if (err) {
            try {
              let errorMessage = `ERROR: ${err.message}\n`;

              if (err["precedingErrors"]) {
                for (const precedingError of err["precedingErrors"]) {
                  errorMessage += ` - ${precedingError.message}\n`;
                }
              }

              if (this.logger) {
                this.logger.error(errorMessage);
              }
              const exception = new Exception(errorMessage);
              exception.innerError = err;
              reject(exception);
            } catch (err) {
              reject(err);
              return;
            }
            return;
          }
          resolve();
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  public prepare(query: string): void {
    this._preparedQueries.push(query);
  }

  public async executePrepared<T>(): Promise<IResult<T>> {
    const result = await this.execute<T>(this._preparedQueries.join("\r\n\r\n"));
    this._preparedQueries = [];
    return result;
  }

  public async call(name: string, params: { [key: string]: any }, outputs: { [key: string]: ISqlType }): Promise<IProcedureResult<any>> {
    if (this.logger) {
      this.logger.log(`CALL: ${name}(${JSON.stringify(params)}, ${JSON.stringify(outputs)})`);
    }

    return new Promise<IProcedureResult<any>>((resolve, reject) => {
      try {
        let req = this._trans ? new Request(this._trans) : new Request(this._conn);
        for (const key of Object.keys(params)) {
          req = req.input(key, params[key]);
        }
        for (const key of Object.keys(outputs)) {
          req = req.output(key, outputs[key]);
        }
        req.execute(name, (err, result) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(result);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  public async initializeAsync(force: boolean = false): Promise<void> {
    const tables = await this.execute("SELECT count(*) as cnt FROM sys.tables WHERE name = '_migration'");
    const hasMigrationTable = tables.recordset[0]["cnt"] > 0;
    if (force || !hasMigrationTable) {
      await this.execute(QueryBuilder.clearDatabase());

      const tableNameAndTypes = Object.keys(this)
        .filter(key => this[key] instanceof Queryable)
        .map(key => [key, this[key].tableType]);

      for (const tableNameAndType of tableNameAndTypes) {
        if (!tableNameAndType[1]) {
          throw new Exception(`${tableNameAndType[0]}의 타입이 잘못되었습니다.`);
        }

        const tableType = tableNameAndType[1];
        const tableDef: ITableDefinition = Reflect.getMetadata(tableMetadataSymbol, tableType);
        if (!tableDef || !tableDef.name) {
          throw new Exception(`${tableType.name}의 @Table()이 누락되었습니다.`);
        }

        // 테이블 생성
        if (tableDef.columns.length > 0) {
          await this.execute(QueryBuilder.createTable(
            tableDef.name,
            tableDef.columns
          ));
        }

        // 기본키 생성
        if (tableDef.primaryKeyColumns.length > 0) {
          await this.execute(QueryBuilder.createPrimaryKey(
            tableDef.name,
            tableDef.primaryKeyColumns
          ));
        }

        // 인덱스 생성
        for (const dbIndex of tableDef.indexes) {
          await this.execute(QueryBuilder.createIndex(
            tableDef.name,
            dbIndex
          ));
        }
      }

      // 외래키 생성
      for (const tableNameAndType of tableNameAndTypes) {
        const tableType = tableNameAndType[1];
        const tableDef: ITableDefinition = Reflect.getMetadata(tableMetadataSymbol, tableType);
        for (const foreignKey of tableDef.foreignKeys) {
          const targetType = foreignKey.targetTableTypeForwarder();
          const targetTableDef: ITableDefinition = Reflect.getMetadata(tableMetadataSymbol, targetType);
          const targetTablePrimaryKeyColumnNames = targetTableDef.primaryKeyColumns.map(item => item.name);

          await this.execute(QueryBuilder.createForeignKey(
            tableDef.name,
            {
              name: foreignKey.name,
              columnNames: foreignKey.columnNames,
              targetTableName: targetTableDef.name,
              targetColumnNames: targetTablePrimaryKeyColumnNames
            }
          ));
        }
      }

      // 함수 생성
      const functionNameAndTypes = Object.keys(this)
        .filter(key => this[key] instanceof QueryableFunction)
        .map(key => [key, this[key].targetType]);

      for (const functionNameAndType of functionNameAndTypes) {
        if (!functionNameAndType[1]) {
          throw new Exception(`${functionNameAndType[0]}의 타입이 잘못되었습니다.`);
        }

        const functionType = functionNameAndType[1];
        const functionDef: IFunctionDefinition = Reflect.getMetadata(functionMetadataSymbol, functionType);
        if (!functionDef || !functionDef.name) {
          throw new Exception(`${functionType.name}의 @Function()이 누락되었습니다.`);
        }

        await this.execute(QueryBuilder.createFunction(functionDef));
      }

      // 프록시저 생성
      const procedureNameAndTypes = Object.keys(this)
        .filter(key => this[key] instanceof QueryableStoredProcedure)
        .map(key => [key, this[key].targetType]);

      for (const procedureNameAndType of procedureNameAndTypes) {
        if (!procedureNameAndType[1]) {
          throw new Exception(`${procedureNameAndType[0]}의 타입이 잘못되었습니다.`);
        }

        const procedureType = procedureNameAndType[1];
        const procedureDef: IStoredProcedureDefinition = Reflect.getMetadata(storedProcedureMetadataSymbol, procedureType);
        if (!procedureDef || !procedureDef.name) {
          throw new Exception(`${procedureType.name}의 @Procedure()이 누락되었습니다.`);
        }

        await this.execute(QueryBuilder.createProcedure(procedureDef));
      }

      await this.execute(
        `${QueryBuilder.createTable("_migration", [
          {
            name: "code",
            dataType: "NVARCHAR",
            nullable: false,
            autoIncrement: false,
            length: 4000
          }
        ])}\r\n${QueryBuilder.createPrimaryKey("_migration", [
          {
            name: "code",
            orderBy: OrderByRule.ASC
          }
        ])}\r\n${this.migrations.map(item => `INSERT INTO [_migration](code) VALUES ('${item}');`).join("\r\n")}`
      );
    }
    else {
      const lastMigration = await this.execute("SELECT MAX(code) as code FROM [_migration]");
      const lastMigrationCode = lastMigration.recordset[0] ? lastMigration.recordset[0]["code"] : "";
      for (const migration of this.migrations.filter(item => item > lastMigrationCode).orderBy()) {
        const query = fs.readFileSync(migration, "utf-8");
        await this.execute(query);
        await this.execute(`INSERT INTO [_migration](code) VALUES ('${migration}')`);
      }
    }
  }

  private async _transFn<R>(fn: () => Promise<R>): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      try {
        this._trans = new Transaction(this._conn);

        this._trans.begin(ISOLATION_LEVEL.READ_COMMITTED, async err => {
          if (err) {
            reject(err);
            return;
          }

          fn()
            .then(result => {
              this._trans!.commit(error => {
                if (error) {
                  reject(error);
                  return;
                }

                delete this._trans;
                resolve(result);
              });
            })
            .catch(error => {
              this._trans!.rollback(() => {
                delete this._trans;
                reject(error);
              });
            });
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}
