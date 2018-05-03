import "reflect-metadata";
import { Safe, Type } from "../../../sd-core/src";
import { IStoredProcedureDefinition } from "./Definitions";
import { DataType } from "./Enums";
import { QueryHelper } from "./QueryHelper";

export const storedProcedureMetadataSymbol = "sd-database.stored-procedure";

//tslint:disable-next-line:variable-name
export const StoredProcedure = <T>(query: string) => (classType: Type<T>) => {
  const def: IStoredProcedureDefinition = Reflect.getMetadata(storedProcedureMetadataSymbol, classType) || {};
  def.name = classType.name;
  def.query = query;
  def.params = def.params || [];
  Reflect.defineMetadata(storedProcedureMetadataSymbol, def, classType);
};

//tslint:disable-next-line:variable-name
export const StoredProcedureParam = <T>(param?: {
  dataType?: DataType;
  length?: number;
}) => (object: T, propertyKey: string) => {
  const classType = object.constructor;
  const safeParam = Safe.obj(param);
  const propertyType = Reflect.getMetadata("design:type", object, propertyKey);

  const def: IStoredProcedureDefinition = Reflect.getMetadata(storedProcedureMetadataSymbol, classType) || {};
  def.params = def.params || [];
  def.params.push({
    name: propertyKey,
    dataType: safeParam.dataType || QueryHelper.convertToDataType(propertyType),
    length: safeParam.length
  });
  Reflect.defineMetadata(storedProcedureMetadataSymbol, def, classType);
};

//tslint:disable-next-line:variable-name
export const StoredProcedureReturn = <T>(param?: {
  dataType?: DataType;
  length?: number;
}) => (object: T, propertyKey: string) => {
  const classType = object.constructor;
  const safeParam = Safe.obj(param);
  const propertyType = Reflect.getMetadata("design:type", object, propertyKey);

  const def: IStoredProcedureDefinition = Reflect.getMetadata(storedProcedureMetadataSymbol, classType) || {};
  def.returnType = propertyType ? {
    dataType: safeParam.dataType || QueryHelper.convertToDataType(propertyType),
    length: safeParam.length
  } : undefined;
  Reflect.defineMetadata(storedProcedureMetadataSymbol, def, classType);
};

//tslint:disable-next-line:variable-name
export const StoredProcedureOutput = <T>(params?: {
  name: string;
  dataType: DataType;
  length?: number;
}[]) => (object: T, propertyKey: string) => {
  const classType = object.constructor;

  const def: IStoredProcedureDefinition = Reflect.getMetadata(storedProcedureMetadataSymbol, classType) || {};
  def.outputs = params;
  Reflect.defineMetadata(storedProcedureMetadataSymbol, def, classType);
};

//tslint:disable-next-line:variable-name
export const StoredProcedureResultRecord = <T>(param?: {
  dataType: DataType;
  length?: number;
}[]) => (object: T, propertyKey: string) => {
  const classType = object.constructor;

  const def: IStoredProcedureDefinition = Reflect.getMetadata(storedProcedureMetadataSymbol, classType) || {};
  def.resultRecordColumns = param;
  Reflect.defineMetadata(storedProcedureMetadataSymbol, def, classType);
};