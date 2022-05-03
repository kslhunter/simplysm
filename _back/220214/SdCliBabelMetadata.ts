import { NeverEntryError, NotImplementError } from "@simplysm/sd-core-common";
import babelParser from "@babel/parser";
import { FsUtil } from "@simplysm/sd-core-node";
import {
  CallExpression,
  ClassDeclaration,
  Expression,
  FunctionDeclaration,
  isArrayExpression,
  isCallExpression,
  isClassDeclaration,
  isDeclaration,
  isExportDeclaration,
  isExportDefaultDeclaration,
  isExportNamedDeclaration,
  isExportSpecifier,
  isExpressionStatement,
  isFunctionDeclaration,
  isIdentifier,
  isImportDeclaration,
  isImportNamespaceSpecifier,
  isImportSpecifier,
  isMemberExpression,
  isObjectExpression,
  isObjectProperty,
  isVariableDeclaration,
  ObjectExpression,
  ObjectProperty,
  PatternLike,
  Statement,
  VariableDeclarator
} from "@babel/types";

export class SdCliBabelMetadata {
  public readonly imports: IImport[] = [];
  public readonly namespaceImports: INamespaceImport[] = [];
  public readonly namedExports: INamedExport[] = [];
  public readonly directExports: IDirectExport[] = [];
  public readonly declarations: TDeclarationMetadata[] = [];
  public readonly ngDeclares: NgDeclareMetadata[] = [];

  public constructor(public readonly moduleName: string,
                     public readonly filePath: string) {
    const content = FsUtil.readFile(filePath);
    this._parse(babelParser.parse(content, { sourceType: "module" }).program.body);
  }

  public findDeclaration(name: string): TDeclarationMetadata | undefined {
    return this.declarations.single((item) => item.name === name);
  }

  public findImports(name: string): IImport | undefined {
    return this.imports.single((item) => item.localName === name);
  }

  public findNamedExports(name: string): INamedExport | undefined {
    return this.namedExports.single((item) => item.exportedName === name);
  }

  public findNgDeclare(className: string): NgDeclareMetadata | undefined {
    return this.ngDeclares.single((item) => item.name === className);
  }

  private _parse(statements: Statement[]): void {
    for (const statement of statements) {
      if (isDeclaration(statement)) {
        if (isExportDeclaration(statement)) {
          if (isExportNamedDeclaration(statement)) {
            for (const specifier of statement.specifiers) {
              if (isExportSpecifier(specifier)) {
                if (isIdentifier(specifier.exported)) {
                  this.namedExports.push({
                    exportedName: specifier.exported.name,
                    localName: specifier.local.name
                  });

                  if (statement.source) {
                    this.imports.push({
                      moduleName: statement.source.value,
                      importedName: specifier.local.name,
                      localName: specifier.exported.name
                    });
                  }
                }
                else {
                  throw new NeverEntryError();
                }
              }
              else {
                throw new NeverEntryError();
              }
            }
          }
          else if (isExportDefaultDeclaration(statement)) {
            this.directExports.push({
              exportedName: "default"
            });
          }
          else {
            throw new NotImplementError();
          }
        }
        else if (isImportDeclaration(statement)) {
          for (const specifier of statement.specifiers) {
            if (isImportSpecifier(specifier)) {
              if (isIdentifier(specifier.imported)) {
                this.imports.push({
                  moduleName: statement.source.value,
                  importedName: specifier.imported.name,
                  localName: specifier.local.name
                });
              }
              else {
                throw new NeverEntryError();
              }
            }
            else if (isImportNamespaceSpecifier(specifier)) {
              this.namespaceImports.push({
                moduleName: statement.source.value,
                localName: specifier.local.name
              });
            }
            else {
              throw new NeverEntryError();
            }
          }
        }
        else if (isVariableDeclaration(statement)) {
          for (const decl of statement.declarations) {
            this.declarations.push(new VariableDeclaratorMetadata(decl));
          }
        }
        else if (isClassDeclaration(statement)) {
          this.declarations.push(new ClassDeclarationMetadata(statement));
        }
        else if (isFunctionDeclaration(statement)) {
          this.declarations.push(new FunctionDeclarationMetadata(statement));
        }
        else {
          throw new NeverEntryError();
        }
      }
      else if (isExpressionStatement(statement)) {
        if (
          isCallExpression(statement.expression) &&
          isMemberExpression(statement.expression.callee) &&
          isIdentifier(statement.expression.callee.property) &&
          statement.expression.callee.property.name === "ɵɵngDeclareClassMetadata"
        ) {
          this.ngDeclares.push(new NgDeclareMetadata(statement.expression));
        }
      }
      // else {
      //   console.log(statement);
      //   // throw new NeverEntryError();
      // }
    }

    this.imports.distinctThis();
  }
}

export interface IImport {
  moduleName: string;
  importedName: string;
  localName: string;
}

export interface INamespaceImport {
  moduleName: string;
  localName: string;
}

export interface INamedExport {
  exportedName: string;
  localName: string;
}

export interface IDirectExport {
  exportedName: string;
}

export type TDeclarationMetadata = ClassDeclarationMetadata | VariableDeclaratorMetadata | FunctionDeclarationMetadata;

export class ClassDeclarationMetadata {
  public get name(): string {
    if (isIdentifier(this._metadata.id)) {
      return this._metadata.id.name;
    }
    else {
      throw new NeverEntryError();
    }
  }

  public constructor(private readonly _metadata: ClassDeclaration) {
  }
}

export class VariableDeclaratorMetadata {
  public get name(): string {
    if (isIdentifier(this._metadata.id)) {
      return this._metadata.id.name;
    }
    else {
      throw new NeverEntryError();
    }
  }

  public constructor(private readonly _metadata: VariableDeclarator) {
  }
}

export class FunctionDeclarationMetadata {
  public get name(): string {
    if (isIdentifier(this._metadata.id)) {
      return this._metadata.id.name;
    }
    else {
      throw new NeverEntryError();
    }
  }

  public constructor(private readonly _metadata: FunctionDeclaration) {
  }
}


export class NgDeclareMetadata {
  public get name(): string {
    if (isObjectExpression(this._metadata.arguments[0])) {
      const typeProp = this._metadata.arguments[0].properties.single((item1) => (
        isObjectProperty(item1) &&
        isIdentifier(item1.key) &&
        item1.key.name === "type"
      )) as ObjectProperty | undefined;
      if (typeProp && isIdentifier(typeProp.value)) {
        return typeProp.value.name;
      }
      else {
        throw new NeverEntryError();
      }
    }
    else {
      throw new NeverEntryError();
    }
  }

  public get type(): string | undefined {
    if (isObjectExpression(this._metadata.arguments[0])) {
      const decoPropVal = this._getObjectPropValue(this._metadata.arguments[0], "decorators");
      if (isArrayExpression(decoPropVal)) {
        if (isObjectExpression(decoPropVal.elements[0])) {
          const propVal = this._getObjectPropValue(decoPropVal.elements[0], "type");
          if (isIdentifier(propVal)) {
            return propVal.name;
          }
          else {
            throw new NeverEntryError();
          }
        }
        else {
          throw new NeverEntryError();
        }
      }
      else {
        throw new NeverEntryError();
      }
    }
    else {
      throw new NeverEntryError();
    }
  }

  public get exports(): (TDeclarationMetadata | IImport | INamespaceImport)[] { // Import Metadata Class로 만들어야할듯?

  }

  private _getObjectPropValue(objectExp: ObjectExpression, propName: string): Expression | PatternLike | undefined {
    const objProp = objectExp.properties.single((item1) => (
      isObjectProperty(item1) &&
      isIdentifier(item1.key) &&
      item1.key.name === propName
    )) as ObjectProperty | undefined;
    return objProp?.value;
  }

  public constructor(private readonly _metadata: CallExpression) {
  }
}
