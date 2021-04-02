import { SdProjectConfigUtil } from "../utils/SdProjectConfigUtil";
import { FsUtil, Logger } from "@simplysm/sd-core-node";
import { SdCliPathUtil } from "../utils/SdCliPathUtil";
import { INpmConfig, ITsConfig } from "../commons";
import * as path from "path";
import { DateTime, JsonConvert, NeverEntryError, NumberUtil, ObjectUtil, Type } from "@simplysm/sd-core-common";
import { SdOrm } from "@simplysm/sd-orm-node";
import { DbContext, DbDefinitionUtil, IDbConnectionConfig, TQueryDef } from "@simplysm/sd-orm-common";

export class SdCliGenDbMigration {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", "gen-db-migration"]);

  public async runAsync(config: string | undefined, dbConfigKey: string): Promise<void> {
    const configObj = await SdProjectConfigUtil.loadConfigAsync(true, [], config);
    const migrationConfig: IDbConnectionConfig & { package: string; context: string; distDir: string } = configObj["db-migration"][dbConfigKey];

    const npmConfigFilePath = SdCliPathUtil.getNpmConfigFilePath(process.cwd());
    const npmConfig: INpmConfig = await FsUtil.readJsonAsync(npmConfigFilePath);
    const allPackagePaths = await npmConfig.workspaces?.mapManyAsync(async (item) => await FsUtil.globAsync(item));
    if (!allPackagePaths) throw new NeverEntryError();

    let pkgPath = "";
    for (const packagePath of allPackagePaths) {
      const packageNpmConfigFilePath = SdCliPathUtil.getNpmConfigFilePath(packagePath);
      if (!FsUtil.exists(packageNpmConfigFilePath)) continue;
      const packageNpmConfig: INpmConfig = await FsUtil.readJsonAsync(packageNpmConfigFilePath);
      if (packageNpmConfig.name === migrationConfig.package) {
        pkgPath = packagePath;
        break;
      }
    }
    const tsconfigPath = path.resolve(pkgPath, "tsconfig.json");
    const tsconfig: ITsConfig = await FsUtil.readJsonAsync(tsconfigPath);
    const indexFilePath = path.resolve(pkgPath, tsconfig.files![0]);
    require("ts-node").register({
      project: tsconfigPath,
      require: ["tsconfig-paths"],
      transpileOnly: true,
      compilerOptions: {
        target: "es2017"
      }
    });
    const dbContextType: Type<DbContext> = require(indexFilePath)[migrationConfig.context];

    const orm = new SdOrm({
      dialect: migrationConfig.dialect ?? "mssql",
      host: migrationConfig.host,
      port: migrationConfig.port,
      username: migrationConfig.username,
      password: migrationConfig.password,
      database: migrationConfig.database,
      defaultIsolationLevel: migrationConfig.defaultIsolationLevel
    });

    const createTableQueryDefs: TQueryDef[] = [];
    const dropTableQueryDefs: TQueryDef[] = [];

    const createIndexQueryDefs: TQueryDef[] = [];
    const dropIndexQueryDefs: TQueryDef[] = [];
    const modifyIndexQueryDefs: TQueryDef[] = [];

    const addColumnQueryDefs: TQueryDef[] = [];
    const removeColumnQueryDefs: TQueryDef[] = [];
    const modifyColumnQueryDefs: TQueryDef[] = [];

    const modifyPkQueryDefs: TQueryDef[] = [];

    const createFkQueryDefs: TQueryDef[] = [];
    const removeFkQueryDefs: TQueryDef[] = [];
    const modifyFkQueryDefs: TQueryDef[] = [];

    await orm.connectAsync(dbContextType, async (db) => {
      const tableDefs = db.tableDefs;

      let dbNames: string[] = [];
      if (migrationConfig.database !== undefined) {
        dbNames = [migrationConfig.database];
      }
      else {
        dbNames = tableDefs.map((item) => item.database ?? db.schema.database).distinct();
      }

      for (const dbName of dbNames) {
        const dbTableInfos = (
          await db.getTableInfosAsync(dbName)
        ).filter((item) => item.schema !== "sys");

        const tableInfos = tableDefs.map((item) => ({
          schema: item.schema ?? db.schema.schema,
          name: item.name
        }));

        const mergedTableInfos = dbTableInfos.concat(tableInfos).distinct();
        for (const mergedTableInfo of mergedTableInfos) {
          const tableDef = tableDefs.single((item) => ObjectUtil.equal({
            schema: item.schema ?? db.schema.schema,
            name: item.name
          }, mergedTableInfo))!;

          // 새 테이블
          if (!dbTableInfos.some((dbTableInfo) => ObjectUtil.equal(dbTableInfo, mergedTableInfo))) {
            createTableQueryDefs.push(db.getCreateTableQueryDefFromTableDef(tableDef));
            createFkQueryDefs.push(...db.getCreateFksQueryDefsFromTableDef(tableDef));
            createIndexQueryDefs.push(...db.getCreateIndexesQueryDefsFromTableDef(tableDef));
            continue;
          }

          // 삭제된 테이블
          if (!tableInfos.some((tableInfo) => ObjectUtil.equal(tableInfo, mergedTableInfo))) {
            dropTableQueryDefs.push({
              type: "dropTable",
              table: {
                database: dbName,
                schema: mergedTableInfo.schema,
                name: mergedTableInfo.name
              }
            });
            continue;
          }

          // 수정된 테이블

          //-- 컬럼 체크
          const dbTableColumnInfos = await db.getTableColumnInfosAsync(dbName, mergedTableInfo.schema, mergedTableInfo.name);
          const dbTableColumnNames = dbTableColumnInfos.map((item) => item.name);

          const tableColumnInfos = tableDef.columns
            .map((item) => {
              const dataTypeStr = db.qh.type(item.dataType ?? item.typeFwd());
              const dataType = dataTypeStr.split("(")[0].toLowerCase();

              const lengthStr = (dataType === "nvarchar" || dataType === "binary") ? (/\((.*)\)/).exec(dataTypeStr)?.[1]?.trim() : undefined;
              const length = lengthStr !== undefined ? (lengthStr === "MAX" ? -1 : NumberUtil.parseInt(lengthStr))
                : dataType === "ntext" ? 1073741823
                  : undefined;

              const precisionStr = (dataType !== "nvarchar" && dataType !== "binary") ? (/\((.*)[,)]/).exec(dataTypeStr)?.[1]?.trim() : undefined;
              const precision = precisionStr !== undefined ? NumberUtil.parseInt(precisionStr)
                : dataType === "bigint" ? 19
                  : undefined;

              const digitsStr = (/,(.*)\)/).exec(dataTypeStr)?.[1]?.trim();
              const digits = digitsStr !== undefined ? NumberUtil.parseInt(digitsStr)
                : dataType === "bigint" ? 0
                  : undefined;

              return {
                name: item.name,
                dataType,
                length,
                precision,
                digits,
                nullable: item.nullable ?? false,
                autoIncrement: item.autoIncrement ?? false
              };
            });
          const tableColumnNames = tableColumnInfos.map((item) => item.name);

          const mergedColumnNames = dbTableColumnNames.concat(tableColumnNames).distinct();

          for (const mergedColumnName of mergedColumnNames) {
            // 새 컬럼
            if (!dbTableColumnNames.includes(mergedColumnName)) {
              addColumnQueryDefs.push(db.getAddColumnQueryDefFromTableDef(tableDef, mergedColumnName));
              continue;
            }

            // 삭제된 컬럼
            if (!tableColumnNames.includes(mergedColumnName)) {
              removeColumnQueryDefs.push({
                type: "removeColumn",
                table: {
                  database: dbName,
                  schema: mergedTableInfo.schema,
                  name: mergedTableInfo.name
                },
                column: mergedColumnName
              });
              continue;
            }

            // 수정된 컬럼
            const dbTableColumnInfo = dbTableColumnInfos.single((item) => item.name === mergedColumnName)!;
            const tableColumnInfo = tableColumnInfos.single((item) => item.name === mergedColumnName)!;

            if (!ObjectUtil.equal(dbTableColumnInfo, tableColumnInfo)) {
              modifyColumnQueryDefs.push(db.getModifyColumnQueryDefFromTableDef(tableDef, mergedColumnName));
            }
          }

          //-- PK 체크
          const dbTablePkNames = await db.getTablePkColumnNamesAsync(dbName, mergedTableInfo.schema, mergedTableInfo.name);
          const tablePkNames = tableDef.columns.filter((item) => item.primaryKey)
            .orderBy((item) => item.primaryKey)
            .map((item) => item.name);

          if (!ObjectUtil.equal(dbTablePkNames, tablePkNames)) {
            modifyPkQueryDefs.push(...db.getModifyPkQueryDefFromTableDef(tableDef, tablePkNames));
          }

          //-- FK 체크
          const dbTableFks = await db.getTableFksAsync(dbName, mergedTableInfo.schema, mergedTableInfo.name);
          const dbTableFkNames = dbTableFks.map((item) => item.name);

          const tableFks = tableDef.foreignKeys.map((item) => {
            const fkTargetType = item.targetTypeFwd();
            const fkTargetTableDef = DbDefinitionUtil.getTableDef(fkTargetType);
            return {
              name: `FK_${dbName}_${mergedTableInfo.schema}_${mergedTableInfo.name}_${item.name}`,
              sourceColumnNames: item.columnPropertyKeys.map((propKey) => tableDef.columns.single((col) => col.propertyKey === propKey)!.name),
              targetSchemaName: fkTargetTableDef.schema ?? mergedTableInfo.schema,
              targetTableName: fkTargetTableDef.name
            };
          });
          const tableFkNames = tableFks.map((item) => item.name);

          const mergedFkNames = dbTableFkNames.concat(tableFkNames).distinct();
          for (const mergedFkName of mergedFkNames) {
            const orgFkName = mergedFkName.replace(`FK_${dbName}_${mergedTableInfo.schema}_${mergedTableInfo.name}_`, "");

            // 새 FK
            if (!dbTableFkNames.includes(mergedFkName)) {
              createFkQueryDefs.push(db.getAddFkQueryDefFromTableDef(tableDef, orgFkName));
              continue;
            }

            // 삭제된 FK
            if (!tableFkNames.includes(mergedFkName)) {
              removeFkQueryDefs.push(db.getRemoveFkQueryDefFromTableDef(tableDef, orgFkName));
              continue;
            }

            // 수정된 FK
            const dbTableFk = dbTableFks.single((item) => item.name === mergedFkName)!;
            const tableFk = tableFks.single((item) => item.name === mergedFkName)!;

            if (!ObjectUtil.equal(dbTableFk, tableFk)) {
              modifyFkQueryDefs.push(...[
                db.getRemoveFkQueryDefFromTableDef(tableDef, orgFkName),
                db.getAddFkQueryDefFromTableDef(tableDef, orgFkName)
              ]);
            }
          }

          //-- 인덱스 체크
          const dbTableIndexes = await db.getTableIndexesAsync(dbName, mergedTableInfo.schema, mergedTableInfo.name);
          const dbTableIndexNames = dbTableIndexes.map((item) => item.name);

          const tableIndexes = tableDef.indexes.map((item) => ({
            name: `IDX_${dbName}_${mergedTableInfo.schema}_${mergedTableInfo.name}_${item.name}`,
            columns: item.columns
              .orderBy((item1) => item1.order)
              .map((col) => ({
                name: tableDef.columns.single((col1) => col1.propertyKey === col.columnPropertyKey)!.name,
                orderBy: col.orderBy
              }))
          })).concat(
            tableDef.foreignKeys.map((item) => ({
              name: `IDX_${dbName}_${mergedTableInfo.schema}_${mergedTableInfo.name}_${item.name}`,
              columns: item.columnPropertyKeys
                .map((columnPropertyKey) => ({
                  name: tableDef.columns.single((col1) => col1.propertyKey === columnPropertyKey)!.name,
                  orderBy: "ASC"
                }))
            }))
          );
          const tableIndexNames = tableIndexes.map((item) => item.name);

          const mergedIndexNames = dbTableIndexNames.concat(tableIndexNames).distinct();

          for (const mergedIndexName of mergedIndexNames) {
            const orgIndexName = mergedIndexName.replace(`IDX_${dbName}_${mergedTableInfo.schema}_${mergedTableInfo.name}_`, "");

            // 새 INDEX
            if (!dbTableIndexNames.includes(mergedIndexName)) {
              createIndexQueryDefs.push(db.getCreateIndexQueryDefFromTableDef(tableDef, orgIndexName));
              continue;
            }

            // 삭제된 INDEX
            if (!tableIndexNames.includes(mergedIndexName)) {
              dropIndexQueryDefs.push(db.getDropIndexQueryDefFromTableDef(tableDef, orgIndexName));
              continue;
            }

            // 수정된 INDEX
            const dbTableIndex = dbTableIndexes.single((item) => item.name === mergedIndexName)!;
            const tableIndex = tableIndexes.single((item) => item.name === mergedIndexName)!;

            if (!ObjectUtil.equal(dbTableIndex.columns, tableIndex.columns)) {
              modifyIndexQueryDefs.push(...[
                db.getDropIndexQueryDefFromTableDef(tableDef, orgIndexName),
                db.getCreateIndexQueryDefFromTableDef(tableDef, orgIndexName)
              ]);
            }
          }
        }
      }
    });

    const queryDefAndComments: (TQueryDef | string)[] = [];
    if (dropTableQueryDefs.length > 0) {
      queryDefAndComments.push(...[
        "// 테이블 삭제",
        "// TODO: 삭제가 아니라, 다른 테이블명으로 변경된 것은 아닌지 반드시 체크하세요.",
        ...dropTableQueryDefs
      ]);
    }
    if (createTableQueryDefs.length > 0) {
      queryDefAndComments.push(...[
        "// 테이블 생성",
        "// TODO: 생성이 아니라, 다른 테이블명에서 변경된 것은 아닌지 반드시 체크하세요.",
        ...createTableQueryDefs
      ]);
    }
    if (removeColumnQueryDefs.length > 0) {
      queryDefAndComments.push(...[
        "// 컬럼 삭제",
        "// TODO: 삭제가 아니라, 다른 컬럼명으로 변경된 것은 아닌지 반드시 체크하세요.",
        ...removeColumnQueryDefs
      ]);
    }
    if (addColumnQueryDefs.length > 0) {
      queryDefAndComments.push(...[
        "// 컬럼 추가",
        "// TODO: 추가가 아니라, 다른 컬럼명에서 변경된 것은 아닌지 반드시 체크하세요.",
        "// TODO: 'NOT NULL' 이라면 기본값(defaultValue) 혹은 값설정이 필요하진 않은지 반드시 체크하세요.",
        ...addColumnQueryDefs
      ]);
    }
    if (modifyColumnQueryDefs.length > 0) {
      queryDefAndComments.push(...[
        "// 컬럼 수정",
        "// TODO: 'NULL => NOT NULL' 이라면 기본값(defaultValue) 혹은 값설정이 필요하진 않은지 반드시 체크하세요.",
        "// TODO: 기타 컬럼의 값(혹은 형식)이 변경되어야 하진 않는지 반드시 체크하세요.",
        ...modifyColumnQueryDefs
      ]);
    }
    if (modifyPkQueryDefs.length > 0) {
      queryDefAndComments.push(...[
        "// PK 변경",
        "// TODO: 컬럼명 수정에 의해 자동 수정되는 내용인지 반드시 체크하세요.",
        ...modifyPkQueryDefs
      ]);
    }
    if (removeFkQueryDefs.length > 0) {
      queryDefAndComments.push(...[
        "// FK 삭제",
        ...removeFkQueryDefs
      ]);
    }
    if (createFkQueryDefs.length > 0) {
      queryDefAndComments.push(...[
        "// FK 생성",
        ...createFkQueryDefs
      ]);
    }
    if (modifyFkQueryDefs.length > 0) {
      queryDefAndComments.push(...[
        "// FK 수정",
        "// TODO: 컬럼명 수정에 의해 자동 수정되는 내용인지 반드시 체크하세요.",
        ...modifyFkQueryDefs
      ]);
    }
    if (dropIndexQueryDefs.length > 0) {
      queryDefAndComments.push(...[
        "// 인덱스 삭제",
        ...dropIndexQueryDefs
      ]);
    }
    if (createIndexQueryDefs.length > 0) {
      queryDefAndComments.push(...[
        "// 인덱스 생성",
        ...createIndexQueryDefs
      ]);
    }
    if (modifyIndexQueryDefs.length > 0) {
      queryDefAndComments.push(...[
        "// 인덱스 수정",
        "// TODO: 컬럼명 수정에 의해 자동 수정되는 내용인지 반드시 체크하세요.",
        ...modifyIndexQueryDefs
      ]);
    }

    if (queryDefAndComments.length > 0) {
      const defsCode = queryDefAndComments
        .map((item) => (typeof item === "string" ? item : JsonConvert.stringify(item, { space: 2 }) + ","))
        .join("\r\n")
        .replace(/\r?\n/g, (item) => item + "      ")
        .replace(/"([^"]+)":/g, (item, g1) => g1 + ":")
        .slice(0, -1);

      const className = `DbMigration${new DateTime().toFormatString("yyMMddHHmmss")}`;
      const result = /* language=TEXT */ `
import { IDbMigration } from "@simplysm/sd-orm-common";
import { ${migrationConfig.context} } from "../${migrationConfig.context}";

export class ${className} implements IDbMigration {
  public async up(db: ${migrationConfig.context}): Promise<void> {
    await db.executeDefsAsync([
      ${defsCode}
    ]);
  }
}
`.replace(/\r?\n/g, "\r\n").trim();

      await FsUtil.writeFileAsync(
        path.resolve(process.cwd(), migrationConfig.distDir, className + ".ts"),
        result
      );
      this._logger.info(`파일이 생성되었습니다: ${path.resolve(process.cwd(), migrationConfig.distDir, className + ".ts")}`);
    }
    else {
      this._logger.info("변경사항이 없습니다.");
    }
  }
}