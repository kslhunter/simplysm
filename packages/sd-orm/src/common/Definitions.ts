import {DataType, IndexType, OrderByRule} from "./Enums";
import {Type} from "../../../sd-core/src";

export interface ITableDefinition {
    name: string;
    columns: IColumnDefinition[];
    primaryKeyColumns: IPrimaryKeyColumnDefinition[];
    indexes: IIndexDefinition[];
    foreignKeys: IForeignKeyDefinition[];
    foreignKeyTargets: IForeignKeyTargetDefinition[];
}

export interface IColumnDefinition {
    name: string;
    dataType: DataType | string;
    nullable: boolean;
    autoIncrement: boolean;
    length?: number;
}

export interface IPrimaryKeyColumnDefinition {
    name: string;
    orderBy: OrderByRule;
}

export interface IIndexDefinition {
    name: string;
    type: IndexType;
    columns: IIndexColumnDefinition[];
}

export interface IIndexColumnDefinition {
    name: string;
    orderBy: OrderByRule;
    order: number;
}

export interface IForeignKeyDefinition {
    name: string;
    columnNames: string[];

    targetTableTypeForwarder(): Type<any>;
}

export interface IForeignKeyTargetDefinition {
    name: string;
    sourceForeignKeyName: string;

    sourceTableTypeForwarder(): Type<any>;
}

export interface IFunctionDefinition {
    name: string;
    params: IFunctionParamColumnDefinition[];
    query: string;
    returnType?: IFunctionReturnDefinition;
}

export interface IFunctionParamColumnDefinition {
    name: string;
    dataType: DataType;
    length?: number;
}

export interface IFunctionReturnDefinition {
    dataType: DataType;
    length?: number;
}

export interface IStoredProcedureDefinition {
    name: string;
    params: IStoredProcedureParamColumnDefinition[];
    query: string;
    outputs?: IStoredProcedureOutputColumnDefinition[];
    returnType?: IStoredProcedureReturnDefinition;
    resultRecordColumns?: IStoredProcedureReturnDefinition[];
}

export interface IStoredProcedureParamColumnDefinition {
    name: string;
    dataType: DataType;
    length?: number;
}

export interface IStoredProcedureReturnDefinition {
    dataType: DataType;
    length?: number;
}

export interface IStoredProcedureOutputColumnDefinition {
    name: string;
    dataType: DataType;
    length?: number;
}

export interface IStoredProcedureResultRecordColumnDefinition {
    dataType: DataType;
    length?: number;
}