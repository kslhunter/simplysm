import {Safe, Type} from "@simplism/sd-core";
import {IFunctionDefinition} from "./Definitions";
import {DataType} from "./Enums";
import {QueryHelper} from "./QueryHelper";

export const functionMetadataSymbol = "sd-database.function";

// tslint:disable-next-line:variable-name
export const Function = <T>(query: string) => (classType: Type<T>) => {
  const def: IFunctionDefinition = Reflect.getMetadata(functionMetadataSymbol, classType) || {};
  def.name = classType.name;
  def.query = query;
  def.params = def.params || [];
  Reflect.defineMetadata(functionMetadataSymbol, def, classType);
};

// tslint:disable-next-line:variable-name
export const FunctionParam = <T>(param?: {
  dataType?: DataType;
  length?: number;
}) => (object: T, propertyKey: string) => {
  const classType = object.constructor;
  const safeParam = Safe.obj(param);
  const propertyType = Reflect.getMetadata("design:type", object, propertyKey);

  const def: IFunctionDefinition = Reflect.getMetadata(functionMetadataSymbol, classType) || {};
  def.params = def.params || [];
  def.params.push({
    name: propertyKey,
    dataType: safeParam.dataType || QueryHelper.convertToDataType(propertyType),
    length: safeParam.length
  });
  Reflect.defineMetadata(functionMetadataSymbol, def, classType);
};

// tslint:disable-next-line:variable-name
export const FunctionReturn = <T>(param?: {
  dataType?: DataType;
  length?: number;
}) => (object: T, propertyKey: string) => {
  const classType = object.constructor;
  const safeParam = Safe.obj(param);
  const propertyType = Reflect.getMetadata("design:type", object, propertyKey);

  const def: IFunctionDefinition = Reflect.getMetadata(functionMetadataSymbol, classType) || {};
  def.returnType = {
    dataType: safeParam.dataType || QueryHelper.convertToDataType(propertyType),
    length: safeParam.length
  };
  Reflect.defineMetadata(functionMetadataSymbol, def, classType);
};
