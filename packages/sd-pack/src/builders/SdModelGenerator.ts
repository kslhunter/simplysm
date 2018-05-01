// tslint:disable:prefer-template

import * as chokidar from "chokidar";
import * as fs from "fs-extra";
import * as glob from "glob";
import * as path from "path";
import {ISimpackModelConfig} from "../commons/ISimpackConfig";
import {Logger, NotImplementedException} from "../../../sd-core/src";

export class SdModelGenerator {
    private _logger = new Logger("@simplism/sd-pack", `SdModelGenerator :: ${this._packageName}`);

    private _root(...args: string[]): string {
        return path.resolve.apply(path, [process.cwd(), `packages/${this._packageName}`].concat(args));
    }

    public constructor(private _packageName: string) {
    }

    public async runAsync(config: ISimpackModelConfig, watch: boolean): Promise<void> {
        if (watch) {
            return await new Promise<void>((resolve) => {
                chokidar.watch(this._root("**", "*.puml").replace(/\\/g, "/"))
                    .on("ready", async () => {
                        await this._generateModelFirst(config!.dist, config.useCamelCase);
                        resolve();
                    })
                    .on("add", () => this._generateModelFirst(config!.dist, config.useCamelCase))
                    .on("change", () => this._generateModelFirst(config!.dist, config.useCamelCase))
                    .on("unlink", () => this._generateModelFirst(config!.dist, config.useCamelCase));
            });
        }
        else {
            await this._generateModelFirst(config!.dist, config.useCamelCase);
        }
    }

    private _timeout?: NodeJS.Timer;

    private async _generateModelFirst(dist: string, useCamelCase?: boolean): Promise<void> {
        return new Promise<void>((resolve) => {
            clearTimeout(this._timeout!);
            this._timeout = setTimeout(async () => {
                this._logger.log(`생성 시작`);

                const className = path.basename(dist, path.extname(dist));

                let modelFileContent = "";
                const modelFilePaths = glob.sync(this._root("**", "*.puml"));
                for (const modelFilePath of modelFilePaths) {
                    const currModelFileContent = fs.readFileSync(modelFilePath, "utf-8");
                    modelFileContent += `${currModelFileContent}\n`;
                }

                const databaseFileContent = await this._modelFileContentToDatabaseFileContent(className, modelFileContent, useCamelCase);
                fs.mkdirsSync(path.dirname(dist));
                fs.writeFileSync(dist, databaseFileContent);

                this._logger.info(`생성 완료: ${dist}`);
                resolve();
            }, 200);
        });
    }

    private async _modelFileContentToDatabaseFileContent(className: string, modelFileContent: string, useCamelCase?: boolean): Promise<string> {
        //----------------------------------
        // 파일 읽기 및 각 부분별 텍스트 정리
        //----------------------------------
        //-- 각 enum 부분 텍스트 추출
        const enumStrings: string[] = modelFileContent.match(/enum[^}]*}/g) || [];

        //-- 각 클래스 부분 텍스트 추출
        const classStrings: string[] = modelFileContent.match(/class[^}]*}/g) || [];

        //-- 각 쿼리 부분 텍스트 추출
        const noteStrings: string[] = modelFileContent.match(/note\s(right|left|top|bottom)((?!end note)(\r|\n|.))*end note/g) || [];

        //----------------------------------
        // 각 부분 텍스트를 List 로 정돈
        //----------------------------------
        const queryList: {
            name: string;
            query: string;
        }[] = [];
        for (const noteString of noteStrings) {
            const matches = noteString.match(/^note\s(right|left|top|bottom)\sof\s(.*)((\r|\n|.)*)((?!end note).)*end note$/);
            if (!matches) {
                throw new Error(`쿼리를 파싱할 수 없습니다. [${noteString}]`);
            }
            queryList.push({
                name: matches[2].trim(),
                query: matches[3].trim()
            });
        }

        let enumList: {
            name: string;
            comment?: string;
            fields: string[];
        }[] = [];

        //-- enum 부분 텍스트별
        for (const enumString of enumStrings) {
            //-- 각 부분 정규식 분할
            const matches = enumString.match(/^enum\s([^<{]*)\s(<<([^>]*)>>\s)?{([^}]*)}$/);
            if (!matches) {
                throw new Error(`열겨헝을 파싱할 수 없습니다. [${enumString}]`);
            }

            const name = matches[1].trim();
            const comment = matches[3] ? matches[3].trim() : matches[3];
            const fields = matches[4].split("\r\n").map((item) => item.trim()).filter((item) => item);

            //-- 맵 데이터 형성
            if (enumList.some((item) => item.name === name)) {
                throw new Error(`enum[${name}]이 중복되었습니다.`);
            }
            enumList.push({
                name,
                comment,
                fields
            });
        }
        enumList = enumList.orderBy((item) => item.name);

        let tableList: {
            name: string;
            comment?: string;
            fields: (IClassField | "sep")[];
        }[] = [];

        let functionList: {
            name: string;
            comment?: string;
            inputFields: IFunctionField[];
            returnType: IReturnType;
            query: string;
        }[] = [];

        let procedureList: {
            name: string;
            comment?: string;
            inputFields: IFunctionField[];
            outputFields: IFunctionField[];
            returnType: IReturnType;
            query: string;
        }[] = [];

        //-- class 부분 텍스트별
        for (const classString of classStrings) {
            //-- 이름/필드 분할
            const matches = classString.match(/^class\s([^<{]*)\s(<<([^>]*)>>\s)?{([^}]*)}$/);
            if (!matches) {
                throw new Error(`클래스를 파싱할 수 없습니다. [${classString}]`);
            }

            const name = matches[1].trim();
            let comment = matches[3] ? matches[3].trim() : matches[3];
            const fieldStrings = matches[4].split("\n").map((item) => item.trim()).filter((item) => item);

            // 함수
            if (comment && comment.startsWith("F:")) {
                comment = comment.slice(2);
                const inputFields: IFunctionField[] = [];
                let returnType: IReturnType = {
                    type: "void"
                };

                for (const fieldString of fieldStrings) {
                    const fieldMatches = fieldString.match(/^([#~+])?\s?([^?:]*)(\?)?:\s([^\s]*)(\s=\s([^\s]*))?(\s<[^>]*>)?(\s+\/\/.*)?/);
                    if (!fieldMatches) {
                        if (fieldString !== "--") {
                            throw new Error(`입력필드를 파싱할 수 없습니다. [${name} -> ${fieldString}]`);
                        }
                        continue;
                    }

                    const options = fieldMatches[7] ? fieldMatches[7].trim().slice(1, -1).split("|") : [];
                    const lengthString = options.single((item) => item.startsWith("L:"));
                    if (fieldMatches[1] === "#") {
                        inputFields.push({
                            name: fieldMatches[2],
                            type: fieldMatches[4],
                            length: lengthString
                                ? Number.parseInt(lengthString.slice(2))
                                : undefined,
                            comment: fieldMatches[8] ? fieldMatches[8].trim().slice(2) : undefined
                        });
                    }
                    else if (fieldMatches[1] === "~") {
                        returnType = {
                            type: fieldMatches[4],
                            length: lengthString
                                ? Number.parseInt(lengthString.slice(2))
                                : undefined,
                            comment: fieldMatches[8] ? fieldMatches[8].trim().slice(2) : undefined
                        };
                    }
                    else {
                        throw new Error(`함수에는 OUTPUT 필드를 설정할 수 없습니다. [${name} -> ${fieldString}]`);
                    }
                }

                if (functionList.some((item) => item.name === name)) {
                    throw new Error(`함수[${name}]가 중복되었습니다.`);
                }

                const queryItem = queryList.single((item) => item.name === name);
                functionList.push({
                    name,
                    comment,
                    inputFields,
                    returnType,
                    query: queryItem ? queryItem.query : ""
                });
            }

            //프록시저
            else if (comment && comment.startsWith("P:")) {
                comment = comment.slice(2);
                const inputFields: IFunctionField[] = [];
                const outputFields: IFunctionField[] = [];
                let returnType: IReturnType = {
                    type: "void"
                };

                for (const fieldString of fieldStrings) {
                    const fieldMatches = fieldString.match(/^([#~+])?\s?([^?:]*)(\?)?:\s([^\s]*)(\s=\s([^\s]*))?(\s<[^>]*>)?(\s+\/\/.*)?/);
                    if (!fieldMatches) {
                        if (fieldString !== "--") {
                            throw new Error(`입력필드를 파싱할 수 없습니다. [${name} -> ${fieldString}]`);
                        }
                        continue;
                    }

                    const options = fieldMatches[7] ? fieldMatches[7].trim().slice(1, -1).split("|") : [];
                    const lengthString = options.single((item) => item.startsWith("L:"));
                    if (fieldMatches[1] === "#") {
                        inputFields.push({
                            name: fieldMatches[2],
                            type: fieldMatches[4],
                            length: lengthString
                                ? Number.parseInt(lengthString.slice(2))
                                : undefined,
                            comment: fieldMatches[8] ? fieldMatches[8].trim().slice(2) : undefined
                        });
                    }
                    else if (fieldMatches[1] === "~") {
                        returnType = {
                            type: fieldMatches[4],
                            length: lengthString
                                ? Number.parseInt(lengthString.slice(2))
                                : undefined,
                            comment: fieldMatches[8] ? fieldMatches[8].trim().slice(2) : undefined
                        };
                    }
                    else {
                        outputFields.push({
                            name: fieldMatches[2],
                            type: fieldMatches[4],
                            length: lengthString
                                ? Number.parseInt(lengthString.slice(2))
                                : undefined,
                            comment: fieldMatches[8] ? fieldMatches[8].trim().slice(2) : undefined
                        });
                    }
                }

                if (procedureList.some((item) => item.name === name)) {
                    throw new Error(`프록시저[${name}]가 중복되었습니다.`);
                }

                const queryItem = queryList.single((item) => item.name === name);
                procedureList.push({
                    name,
                    comment,
                    inputFields,
                    outputFields,
                    returnType,
                    query: queryItem ? queryItem.query : ""
                });
            }

            // 테이블
            else {
                //-- 필드 텍스트 분할
                const fields: (IClassField | "sep")[] = [];
                for (const fieldString of fieldStrings) {
                    const fieldMatches = fieldString.match(/^([#~+])?\s?([^?:]*)(\?)?:\s([^\s]*)(\s=\s([^\s]*))?(\s<[^>]*>)?(\s+\/\/.*)?/);
                    if (!fieldMatches) {
                        if (fieldString !== "--") {
                            throw new Error(`필드를 파싱할 수 없습니다. [${name} -> ${fieldString}]`);
                        }

                        fields.push("sep");
                        continue;
                    }

                    const options = fieldMatches[7] ? fieldMatches[7].trim().slice(1, -1).split("|") : [];
                    const lengthString = options.single((item) => item.startsWith("L:"));
                    const dataTypeString = options.single((item) => item.startsWith("D:"));
                    fields.push({
                        isPrimaryKey: fieldMatches[1] === "#",
                        length: lengthString
                            ? Number.parseInt(lengthString.slice(2))
                            : undefined,
                        isAutoIncrement: options.some((item) => item === "AI"),
                        isForeignKey: fieldMatches[1] === "~",
                        isForeignKeyTarget: fieldMatches[1] === "+",
                        name: fieldMatches[2],
                        isNullable: !!fieldMatches[3],
                        type: fieldMatches[4],
                        dataType: /[~+]/.test(fieldMatches[1]) ? undefined
                            : dataTypeString ? dataTypeString.slice(2)
                                : this._convertToDbTypeString(fieldMatches[4]),
                        foreignKeys: /[~+]/.test(fieldMatches[1])
                            ? options[0].split(",").map((item) => item.trim())
                            : undefined,
                        defaultValue: fieldMatches[6] ? fieldMatches[6].trim() : undefined,
                        comment: fieldMatches[8] ? fieldMatches[8].trim().slice(2) : undefined,
                        hasIndex: options.some((item) => item === "IX")
                    });
                }

                //-- 맵 데이터 형성
                if (tableList.some((item) => item.name === name)) {
                    throw new Error(`테이블[${name}]가 중복되었습니다.`);
                }
                tableList.push({
                    name,
                    comment,
                    fields
                });
            }
        }
        tableList = tableList.orderBy((item) => item.name);
        functionList = functionList.orderBy((item) => item.name);
        procedureList = procedureList.orderBy((item) => item.name);

        //----------------------------------
        // TS 파일로 쓰기
        //----------------------------------
        let resultString = "";

        //-- Database 만들기
        resultString += `
export abstract class ${className} extends Database {
    protected constructor(config: IConnectionConfig, migrations: string[]) {
        super(config, migrations);
    }

    ${tableList.map((item) => `public ${useCamelCase ? this._castToCamelCase(item.name) : item.name} = new Queryable(this, ${item.name});`).join("\r\n    ")}
    
    ${functionList.map((item) => `public ${useCamelCase ? this._castToCamelCase(item.name) : item.name} = new QueryableFunction(this, ${item.name});`).join("\r\n    ")}
    
    ${procedureList.map((item) => `public ${useCamelCase ? this._castToCamelCase(item.name) : item.name} = new QueryableStoredProcedure(this, ${item.name});`).join("\r\n    ")}
    
`.trim() + "\r\n}";
        resultString += "\r\n";

        //-- enum들
        for (const item of enumList) {
            resultString += item.comment ? `/**\r\n * ${item.comment}\r\n */\r\n` : "";
            resultString += `
export enum ${item.name} {
    ${item.fields.map((field) => `${field} = \"${field}\"`).join(",\r\n    ")}
}`.trim();
            resultString += "\r\n";
        }
        resultString += "\r\n";

        //-- 테이블들
        //기본 테이블 텍스트 생성
        for (const item of tableList) {
            const getColumnOption = (field: IClassField) => {
                const str = [
                    field.isNullable ? "nullable: true" : undefined,
                    field.dataType ? `dataType: "${field.dataType}"` : undefined,
                    field.length ? `length: ${field.length}` : undefined,
                    field.isAutoIncrement ? `autoIncrement: ${field.isAutoIncrement}` : undefined
                ].filterExists().join(", ");

                return str ? `{${str}}` : "";
            };

            const getFieldString = (field: IClassField | "sep") => {
                return field === "sep"
                    ? "//------------------------"
                    : (field.comment ? "/**\r\n * " + field.comment + "\r\n */\r\n" : "")
                    + (field.hasIndex ? `@Index()\r\n` : "")
                    + (field.isPrimaryKey ? `@PrimaryKey()\r\n` : "")
                    + (field.isForeignKey ? `@ForeignKey(${item.name}, () => ${field.type}, (m) => [${field.foreignKeys!.map((item1) => `m.${item1}`).join(", ")}])\r\n` : "")
                    + (field.isForeignKeyTarget ? `@ForeignKeyTarget(() => ${field.type.replace(/\[]$/g, "")}, (m) => m.${field.foreignKeys![0]})\r\n` : "")
                    + (!field.isForeignKey && !field.isForeignKeyTarget ? `@Column(${getColumnOption(field)})\r\n` : "")
                    + "public "
                    + field.name + (field.isForeignKey || field.isForeignKeyTarget || field.isAutoIncrement || field.defaultValue ? "?" : "!")
                    + ": " + field.type.replace(/\|/g, " | ") + (field.isNullable ? " | undefined" : "")
                    + (field.defaultValue ? " = " + field.defaultValue : "")
                    + ";\r\n";
            };

            resultString += item.comment ? `/**\r\n * ${item.comment}\r\n */\r\n` : "";
            resultString += `
@Table()
export class ${item.name} {
    ${item.fields.map(getFieldString).map((item1) => item1.replace(/\r\n/g, "\r\n    ")).join("\r\n    ")}
}`.trim();
            resultString += "\r\n";
        }
        resultString += "\r\n";

        //-- 함수들
        for (const item of functionList) {
            const getFunctionParamOption = (field: IReturnType) => {
                const str = [
                    field.length ? `length: ${field.length}` : undefined
                ].filterExists().join(", ");

                return str ? `{${str}}` : "";
            };

            const getFieldString = (field: IFunctionField) => {
                return (field.comment ? "/**\r\n * " + field.comment + "\r\n */\r\n" : "")
                    + `@FunctionParam(${getFunctionParamOption(field)})\r\n`
                    + field.name
                    + "?: " + field.type
                    + ";\r\n";
            };

            resultString += item.comment ? `/**\r\n * ${item.comment}\r\n */\r\n` : "";
            resultString += `
@Function(\`${item.query}\`)
export class ${item.name} {
    ${item.inputFields.map(getFieldString).map((item1) => item1.replace(/\r\n/g, "\r\n    ")).join("\r\n    ")}
    
    //------------------------
    ${item.returnType.comment ? "/**\r\n     * " + item.returnType.comment + "\r\n     */" : ""}
    @FunctionReturn(${getFunctionParamOption(item.returnType)})
    returnType?: ${item.returnType.type};
}`.trim();
            resultString += "\r\n";
        }
        resultString += "\r\n";

        //-- 프록시저들
        for (const item of procedureList) {
            const getProcedureParamOption = (field: IReturnType) => {
                const str = [
                    field.length ? "length: " + field.length : undefined
                ].filterExists().join(", ");

                return str ? `{${str}}` : "";
            };

            const getFieldString = (field: IFunctionField) => {
                return (field.comment ? "/**\r\n * " + field.comment + "\r\n */\r\n" : "")
                    + `@StoredProcedureParam(${getProcedureParamOption(field)})\r\n`
                    + field.name
                    + "?: " + field.type
                    + ";\r\n";
            };

            const getOutputDef = (field: IFunctionField) => {
                const dataType = this._convertToDbTypeString(field.type);
                if (dataType) {
                    return `\r\n        {name: "${field.name}", dataType: DataType.${this._convertToDbTypeString(field.type)}}`;
                }
                return undefined;
            };

            resultString += item.comment ? `/**\r\n * ${item.comment}\r\n */\r\n` : "";
            resultString += `
@StoredProcedure(\`${"\r\n" + item.query}\`)
export class ${item.name} {
    ${item.inputFields.map(getFieldString).map((item1) => item1.replace(/\r\n/g, "\r\n    ")).join("\r\n    ")}
    
    //------------------------
    @StoredProcedureOutput([${item.outputFields.map(getOutputDef).filterExists().join(",")}
    ])
    outputType?: {${item.outputFields.map((item1) => "\r\n        " + item1.name + ": " + item1.type + ";").join("")}
    };
    
    //------------------------
    ${item.returnType.comment ? "/**\r\n     * " + item.returnType.comment + "\r\n     */" : ""}
    @StoredProcedureReturn(${getProcedureParamOption(item.returnType)})
    returnType?: ${item.returnType.type};
}`.trim();
            resultString += "\r\n";
        }
        resultString += "\r\n";

        //-- import들
        //import "@simplism/sd-orm" 지정
        let importString = "";
        if (resultString.includes("mssql.")) {
            importString += "import * as mssql from \"mssql\";\r\n";
        }
        importString += "import {Database, Table, IConnectionConfig";
        if (resultString.includes("Queryable(")) {
            importString += ", Queryable";
        }
        if (resultString.includes("QueryableFunction(")) {
            importString += ", QueryableFunction";
        }
        if (resultString.includes("QueryableStoredProcedure(")) {
            importString += ", QueryableStoredProcedure";
        }
        if (resultString.includes("@Function(")) {
            importString += ", Function";
        }
        if (resultString.includes("@FunctionParam(")) {
            importString += ", FunctionParam";
        }
        if (resultString.includes("@FunctionReturn(")) {
            importString += ", FunctionReturn";
        }
        if (resultString.includes("@PrimaryKey(")) {
            importString += ", PrimaryKey";
        }
        if (resultString.includes("@Column(")) {
            importString += ", Column";
        }
        if (resultString.includes("@Index(")) {
            importString += ", Index";
        }
        if (resultString.includes("@StoredProcedure(")) {
            importString += ", StoredProcedure";
        }
        if (resultString.includes("@StoredProcedureParam(")) {
            importString += ", StoredProcedureParam";
        }
        if (resultString.includes("@StoredProcedureOutput(")) {
            importString += ", StoredProcedureOutput";
        }
        if (resultString.includes("@StoredProcedureReturn(")) {
            importString += ", StoredProcedureReturn";
        }
        if (resultString.includes(" DataType.")) {
            importString += ", DataType";
        }
        if (tableList.some((item) => item.fields.some((item1) => item1 !== "sep" && item1.isForeignKey))) {
            importString += ", ForeignKey";
        }
        if (tableList.some((item) => item.fields.some((item1) => item1 !== "sep" && item1.isForeignKeyTarget))) {
            importString += ", ForeignKeyTarget";
        }
        importString += "} from \"@simplism/sd-orm\";\r\n";

        //import "@simplism/sd-core" 지정
        if (
            resultString.includes(": DateOnly") ||
            resultString.includes(": Uuid") ||
            resultString.includes(": Time")
        ) {
            importString += "\r\nimport {";
            if (resultString.includes(": DateOnly")) {
                importString += "DateOnly, ";
            }
            if (resultString.includes(": Uuid")) {
                importString += "Uuid, ";
            }
            if (resultString.includes(": Time")) {
                importString += "Time, ";
            }
            importString = importString.slice(0, -2) + "} from \"@simplism/sd-core\";";
        }

        resultString = importString + "\r\n\r\n" + resultString;

        if (!useCamelCase) {
            resultString = "//tslint:disable:class-name\r\n\r\n" + resultString;
        }

        return resultString.trim() + "\r\n";
    }

    private _castToCamelCase(str: string): string {
        return str[0].toLowerCase() + str.slice(1);
    }

    private _convertToDbTypeString(type: string): string | undefined {
        switch (type) {
            case "number":
                return "INT";
            case "string":
                return "NVARCHAR";
            case "boolean":
                return "BIT";
            case "Date":
                return "DATETIME";
            case "DateOnly":
                return "DATE";
            case "Time":
                return "TIME";
            case "Uuid":
                return "UNIQUEIDENTIFIER";
            case "Buffer":
                return "VARBINARY";
            case "void":
                return undefined;
            default:
                if (/["|]/.test(type)) {
                    return "NVARCHAR";
                }

                throw new NotImplementedException(type);
        }
    }
}

interface IClassField {
    name: string;
    type: string;
    isPrimaryKey: boolean;
    length?: number;
    isAutoIncrement: boolean;
    isForeignKey: boolean;
    isForeignKeyTarget: boolean;
    isNullable: boolean;
    comment?: string;
    defaultValue?: string;
    foreignKeys?: string[];
    dataType?: string;
    hasIndex?: boolean;
}

interface IFunctionField {
    name: string;
    type: string;
    length?: number;
    comment?: string;
}

interface IReturnType {
    type: string;
    length?: number;
    comment?: string;
}