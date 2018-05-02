import "reflect-metadata";
import {Exception, LambdaParser, Safe, Type, Uuid} from "../../../sd-core/src";
import {ITableDefinition} from "./Definitions";
import {DataType, IndexType, OrderByRule} from "./Enums";
import {QueryHelper} from "./QueryHelper";

export const tableMetadataSymbol = "sd-database.table";

//tslint:disable-next-line:variable-name
export const Table = <T>() => (classType: Type<T>) => {
  const def: ITableDefinition = Reflect.getMetadata(tableMetadataSymbol, classType) || {};
  def.name = classType.name;
  def.columns = def.columns || [];
  def.primaryKeyColumns = def.primaryKeyColumns || [];
  def.indexes = def.indexes || [];
  def.foreignKeys = def.foreignKeys || [];
  def.foreignKeyTargets = def.foreignKeyTargets || [];
  Reflect.defineMetadata(tableMetadataSymbol, def, classType);
};

//tslint:disable-next-line:variable-name
export const PrimaryKey = <T>(param?: { orderBy?: OrderByRule }) => (object: T, propertyKey: string) => {
  const classType = object.constructor;

  const def: ITableDefinition = Reflect.getMetadata(tableMetadataSymbol, classType) || {};
  def.primaryKeyColumns = def.primaryKeyColumns || [];
  def.primaryKeyColumns.push({
    name: propertyKey,
    orderBy: Safe.obj(param).orderBy || OrderByRule.ASC
  });
  Reflect.defineMetadata(tableMetadataSymbol, def, classType);
};

//tslint:disable-next-line:variable-name
export const Column = <T>(param?: {
  dataType?: DataType | string;
  nullable?: boolean;
  autoIncrement?: boolean;
  length?: number;
}) => (object: T, propertyKey: string) => {
  const classType = object.constructor;
  const safeParam = Safe.obj(param);
  const propertyType = Reflect.getMetadata("design:type", object, propertyKey);

  if (typeof safeParam.dataType === "string" && safeParam.dataType.includes("(") && safeParam.length) {
    throw new Exception(`데이터 타입의 길이 설정이 중복되었습니다. (타입: ${safeParam.dataType})`);
  }

  const def: ITableDefinition = Reflect.getMetadata(tableMetadataSymbol, classType) || {};
  def.columns = def.columns || [];
  def.columns.push({
    name: propertyKey,
    dataType: safeParam.dataType || QueryHelper.convertToDataType(propertyType),
    nullable: safeParam.nullable || false,
    autoIncrement: safeParam.autoIncrement || false,
    length: safeParam.length
  });
  Reflect.defineMetadata(tableMetadataSymbol, def, classType);
};

//tslint:disable-next-line:variable-name
export const Index = <T>(param?: {
  name?: string;
  order?: number;
  orderBy?: OrderByRule;
  type?: IndexType;
}) => (object: T, propertyKey: string) => {
  const classType = object.constructor;
  const safeParam = Safe.obj(param);

  const indexName = safeParam.name || Uuid.newUuid().toString();
  const indexType = safeParam.type || IndexType.DEFAULT;

  const def: ITableDefinition = Reflect.getMetadata(tableMetadataSymbol, classType) || {};
  def.indexes = def.indexes || [];

  const areadyExistsIndex = def.indexes.single((item) => item.name === indexName);
  if (areadyExistsIndex) {
    if (areadyExistsIndex.type !== indexType) {
      throw new Exception(`이름은 같고 타입은 다른 인덱스가 존재합니다. (인덱스명: ${indexName})`);
    }

    areadyExistsIndex.columns.push({
      name: propertyKey,
      orderBy: safeParam.orderBy || OrderByRule.ASC,
      order: safeParam.order || (areadyExistsIndex.columns.max((item) => item.order)! + 1)
    });
  }
  else {
    def.indexes.push({
      name: indexName,
      type: indexType,
      columns: [{
        name: propertyKey,
        orderBy: safeParam.orderBy || OrderByRule.ASC,
        order: safeParam.order || 1
      }]
    });
  }

  Reflect.defineMetadata(tableMetadataSymbol, def, classType);
};

//tslint:disable-next-line:variable-name
export const ForeignKey = <T>(sourceType: Type<T>,
                              targetTypeFn: () => Type<any>,
                              columnNamesFn: (entity: T) => any[]) => (object: T, propertyKey: string) => {
  const classType = object.constructor;

  const parsed = LambdaParser.parse(columnNamesFn);
  const itemParamName = parsed.params[0];
  const returnContentMatch = parsed.returnContent.match(/\[(.*)]/);
  if (!returnContentMatch) {
    throw new Exception(`@ForeignKey 입력값이 잘못되었습니다:\n${parsed.returnContent}\n`);
  }
  const sourceColumnNames = returnContentMatch[1].split(",")
    .map((item) => item
      .replace(new RegExp(`${itemParamName}\\.`), "")
      .trim()
    );

  const def: ITableDefinition = Reflect.getMetadata(tableMetadataSymbol, classType) || {};
  def.foreignKeys = def.foreignKeys || [];
  def.foreignKeys.push({
    name: propertyKey,
    columnNames: sourceColumnNames,
    targetTableTypeForwarder: targetTypeFn
  });
  Reflect.defineMetadata(tableMetadataSymbol, def, classType);
};

//tslint:disable-next-line:variable-name
export const ForeignKeyTarget = <T, S>(sourceTypeFn: () => Type<S>,
                                       fkProperty: (entity: S) => T) => (object: T, propertyKey: string) => {
  const classType = object.constructor;

  const parsed = LambdaParser.parse(fkProperty);
  const itemParamName = parsed.params[0];
  const sourcePropertyKey = parsed.returnContent
    .replace(new RegExp(`${itemParamName}\\.`), "")
    .trim();

  const def: ITableDefinition = Reflect.getMetadata(tableMetadataSymbol, classType) || {};
  def.foreignKeyTargets = def.foreignKeyTargets || [];
  def.foreignKeyTargets.push({
    name: propertyKey,
    sourceForeignKeyName: sourcePropertyKey,
    sourceTableTypeForwarder: sourceTypeFn
  });
  Reflect.defineMetadata(tableMetadataSymbol, def, classType);
};