import { FsUtil } from "@simplysm/sd-core-node";
import ts from "typescript";
import { NeverEntryError } from "@simplysm/sd-core-common";
import { TSdCliMetaRef } from "../commons";
import path from "path";

export class SdCliTsFileMetadata {
  private readonly _sourceFile: ts.SourceFile;

  public constructor(public readonly filePath: string) {
    const fileContent = FsUtil.readFile(filePath);
    this._sourceFile = ts.createSourceFile(filePath, fileContent, ts.ScriptTarget.ES2017);
  }

  private _directExportClassMap?: Map<string, SdCliTsClassMetadata>;

  public get directExportClassMap(): Map<string, SdCliTsClassMetadata> {
    if (this._directExportClassMap) return this._directExportClassMap;

    const result = new Map<string, SdCliTsClassMetadata>();
    this._sourceFile.forEachChild((node) => {
      if (!node.modifiers || !node.modifiers.some((item) => item.kind === ts.SyntaxKind.ExportKeyword)) return;
      if (!ts.isClassDeclaration(node)) return;
      if (node.name === undefined) {
        throw new NeverEntryError();
      }
      result.set(node.name.text, new SdCliTsClassMetadata(this, node));
    });

    this._directExportClassMap = result;
    return result;
  }

  public get imports(): TSdCliMetaRef[] {
    const result: TSdCliMetaRef[] = [];

    ts.forEachChild(this._sourceFile, (node) => {
      if (ts.isImportDeclaration(node)) {
        if (ts.isStringLiteral(node.moduleSpecifier)) {
          if (node.importClause) {
            if (node.moduleSpecifier.text.includes(".")) {
              const moduleFilePath = path.resolve(path.dirname(this.filePath), node.moduleSpecifier.text);

              if (node.importClause.namedBindings) {
                if (ts.isNamedImports(node.importClause.namedBindings)) {
                  for (const el of node.importClause.namedBindings.elements) {
                    result.push({
                      filePath: moduleFilePath,
                      name: el.name.text,
                      __TDeclRef__: "__TDeclRef__" as const
                    });
                  }
                }
                else {
                  throw new NeverEntryError();
                }
              }
              else {
                result.push({
                  filePath: moduleFilePath,
                  name: "default",
                  __TDeclRef__: "__TDeclRef__" as const
                });
              }
            }
            else {
              const moduleName = node.moduleSpecifier.text;
              if (node.importClause.namedBindings) {
                if (ts.isNamedImports(node.importClause.namedBindings)) {
                  for (const el of node.importClause.namedBindings.elements) {
                    result.push({
                      moduleName,
                      name: el.propertyName?.text ?? el.name.text,
                      __TDeclRef__: "__TDeclRef__" as const
                    });
                  }
                }
                else {
                  const nsUseList = this._findNamespaceUse(node.importClause.namedBindings.name.text);
                  for (const nsUse of nsUseList) {
                    result.push({
                      moduleName,
                      name: nsUse,
                      __TDeclRef__: "__TDeclRef__" as const
                    });
                  }
                }
              }
              else if (node.importClause.name) {
                const nsUseList = this._findNamespaceUse(node.importClause.name.text);
                for (const nsUse of nsUseList) {
                  result.push({
                    moduleName: moduleName,
                    name: nsUse,
                    __TDeclRef__: "__TDeclRef__" as const
                  });
                }
              }
              else {
                throw new NeverEntryError();
              }
            }
          }
          else {
            // 무시
          }
        }
        else {
          throw new NeverEntryError();
        }
      }
      else if (ts.isExportDeclaration(node)) {
        if (
          node.exportClause &&
          ts.isNamedExports(node.exportClause) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          if (node.moduleSpecifier.text.includes(".")) {
            const moduleFilePath = path.resolve(path.dirname(this.filePath), node.moduleSpecifier.text);
            for (const el of node.exportClause.elements) {
              if (el.propertyName && el.name.text !== el.propertyName.text) {
                throw new NeverEntryError();
              }

              result.push({
                filePath: moduleFilePath,
                name: el.name.text,
                __TDeclRef__: "__TDeclRef__" as const
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
    });

    return result;
  }

  private _findNamespaceUse(localName: string): string[] {
    const fn = (parent: ts.Node): string[] => {
      const result: string[] = [];
      ts.forEachChild(parent, (node) => {
        if (ts.isPropertyAccessExpression(node)) {
          if (
            ts.isIdentifier(node.expression) &&
            node.expression.text === localName &&
            ts.isIdentifier(node.name)
          ) {
            result.push(node.name.text);
          }
        }
        else {
          result.push(...fn(node));
        }
      });

      return result;
    };

    return fn(this._sourceFile);
  }

  public getMetaFromNode(node: ts.Node): TSdCliTsMetadata {
    if (ts.isClassDeclaration(node)) {
      return new SdCliTsClassMetadata(this, node);
    }
    else if (ts.isStringLiteral(node)) {
      return node.text;
    }
    else if (ts.isNoSubstitutionTemplateLiteral(node)) {
      return node.text;
    }
    else if (node.kind === ts.SyntaxKind.NullKeyword) {
      return null;
    }

    throw new NeverEntryError();
  }
}

export class SdCliTsClassMetadata {
  public constructor(private readonly _fileMeta: SdCliTsFileMetadata,
                     private readonly _node: ts.ClassDeclaration) {
  }

  public get ngDecl(): TSdCliTsNgMetadata | undefined {
    if (!this._node.decorators) return undefined;

    for (const deco of this._node.decorators) {
      if (!ts.isCallExpression(deco.expression)) continue;
      if (!ts.isIdentifier(deco.expression.expression)) {
        throw new NeverEntryError();
      }

      if (deco.expression.expression.text === "Injectable") {
        return new SdCliTsNgInjectableMetadata(this._fileMeta, deco);
      }
      else if (deco.expression.expression.text === "Directive") {
        return new SdCliTsNgDirectiveMetadata(this._fileMeta, deco);
      }
      else if (deco.expression.expression.text === "Component") {
        return new SdCliTsNgComponentMetadata(this._fileMeta, deco);
      }
      else if (deco.expression.expression.text === "Pipe") {
        return new SdCliTsNgPipeMetadata(this._fileMeta, deco);
      }
    }

    return undefined;
  }
}

export class SdCliTsObjectMetadata {
  public constructor(private readonly _fileMeta: SdCliTsFileMetadata,
                     private readonly _node: ts.ObjectLiteralExpression) {
  }

  public getPropValue(propName: string): TSdCliTsMetadata | undefined {
    const prop = this._node.properties.single((item) => (
      ts.isPropertyAssignment(item) &&
      ts.isIdentifier(item.name) &&
      item.name.text === propName
    )) as ts.PropertyAssignment | undefined;
    if (!prop) return undefined;

    return this._fileMeta.getMetaFromNode(prop.initializer);
  }
}

export type TSdCliTsMetadata = SdCliTsClassMetadata
  | SdCliTsObjectMetadata
  | TSdCliMetaRef
  | string
  | null;

export class SdCliTsNgInjectableMetadata {
  public constructor(private readonly _fileMeta: SdCliTsFileMetadata,
                     private readonly _node: ts.Decorator) {
  }

  public get providedIn(): string | undefined {
    if (!ts.isCallExpression(this._node.expression)) throw new NeverEntryError();

    if (this._node.expression.arguments.length > 0 && ts.isObjectLiteralExpression(this._node.expression.arguments[0])) {
      const decoArg = new SdCliTsObjectMetadata(this._fileMeta, this._node.expression.arguments[0]);
      const decoArgSelectorVal = decoArg.getPropValue("providedIn");
      if (typeof decoArgSelectorVal === "string") {
        return decoArgSelectorVal;
      }
    }

    return undefined;
  }
}

export class SdCliTsNgDirectiveMetadata {
  public constructor(private readonly _fileMeta: SdCliTsFileMetadata,
                     private readonly _node: ts.Decorator) {
  }

  public get selector(): string {
    if (!ts.isCallExpression(this._node.expression)) throw new NeverEntryError();

    if (this._node.expression.arguments.length > 0 && ts.isObjectLiteralExpression(this._node.expression.arguments[0])) {
      const decoArg = new SdCliTsObjectMetadata(this._fileMeta, this._node.expression.arguments[0]);
      const decoArgSelectorVal = decoArg.getPropValue("selector");
      if (typeof decoArgSelectorVal === "string") {
        return decoArgSelectorVal;
      }
    }

    throw new NeverEntryError();
  }
}

export class SdCliTsNgComponentMetadata {
  public constructor(private readonly _fileMeta: SdCliTsFileMetadata,
                     private readonly _node: ts.Decorator) {
  }

  public get selector(): string {
    if (!ts.isCallExpression(this._node.expression)) throw new NeverEntryError();

    if (this._node.expression.arguments.length > 0 && ts.isObjectLiteralExpression(this._node.expression.arguments[0])) {
      const decoArg = new SdCliTsObjectMetadata(this._fileMeta, this._node.expression.arguments[0]);
      const decoArgSelectorVal = decoArg.getPropValue("selector");
      if (typeof decoArgSelectorVal === "string") {
        return decoArgSelectorVal;
      }
    }

    throw new NeverEntryError();
  }

  public get template(): string {
    if (!ts.isCallExpression(this._node.expression)) throw new NeverEntryError();

    if (this._node.expression.arguments.length > 0 && ts.isObjectLiteralExpression(this._node.expression.arguments[0])) {
      const decoArg = new SdCliTsObjectMetadata(this._fileMeta, this._node.expression.arguments[0]);
      const decoArgSelectorVal = decoArg.getPropValue("template");
      if (typeof decoArgSelectorVal === "string") {
        return decoArgSelectorVal;
      }
    }

    throw new NeverEntryError();
  }
}

export class SdCliTsNgPipeMetadata {
  public constructor(private readonly _fileMeta: SdCliTsFileMetadata,
                     private readonly _node: ts.Decorator) {
  }

  public get pipeName(): string {
    if (!ts.isCallExpression(this._node.expression)) throw new NeverEntryError();

    if (this._node.expression.arguments.length > 0 && ts.isObjectLiteralExpression(this._node.expression.arguments[0])) {
      const decoArg = new SdCliTsObjectMetadata(this._fileMeta, this._node.expression.arguments[0]);
      const decoArgSelectorVal = decoArg.getPropValue("name");
      if (typeof decoArgSelectorVal === "string") {
        return decoArgSelectorVal;
      }
    }

    throw new NeverEntryError();
  }
}

export type TSdCliTsNgMetadata = SdCliTsNgInjectableMetadata
  | SdCliTsNgDirectiveMetadata
  | SdCliTsNgComponentMetadata
  | SdCliTsNgPipeMetadata;
