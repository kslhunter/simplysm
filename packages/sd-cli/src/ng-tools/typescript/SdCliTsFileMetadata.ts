import { FsUtil } from "@simplysm/sd-core-node";
import ts from "typescript";
import { NeverEntryError } from "@simplysm/sd-core-common";
import { TSdCliMetaRef } from "../commons";
import path from "path";

export class SdCliTsFileMetadata {
  public readonly sourceFile: ts.SourceFile;

  public constructor(public readonly filePath: string) {
    const fileContent = FsUtil.readFile(filePath);
    this.sourceFile = ts.createSourceFile(filePath, fileContent, ts.ScriptTarget.ES2017);
  }

  private _directExportClassesCache?: { exportedName: string; target: SdCliTsClassMetadata }[];

  public get directExportClasses(): { exportedName: string; target: SdCliTsClassMetadata }[] {
    if (this._directExportClassesCache) return this._directExportClassesCache;

    const result: { exportedName: string; target: SdCliTsClassMetadata }[] = [];
    this.sourceFile.forEachChild((node) => {
      if (!node.modifiers || !node.modifiers.some((item) => item.kind === ts.SyntaxKind.ExportKeyword)) return;
      if (!ts.isClassDeclaration(node)) return;
      if (node.name === undefined) {
        throw new NeverEntryError();
      }
      result.push({ exportedName: node.name.text, target: new SdCliTsClassMetadata(this, node) });
    });

    this._directExportClassesCache = result;
    return result;
  }

  public get imports(): TSdCliMetaRef[] {
    const result: TSdCliMetaRef[] = [];

    ts.forEachChild(this.sourceFile, (node) => {
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
                      __TSdCliMetaRef__: "__TSdCliMetaRef__" as const
                    });
                  }
                }
                else {
                  // throw SdCliTsUtil.error("'import * as [name] from ...'을 'import [name] from ...'로 변경하세요.", this.sourceFile, node);
                }
              }
              else {
                result.push({
                  filePath: moduleFilePath,
                  name: "default",
                  __TSdCliMetaRef__: "__TSdCliMetaRef__" as const
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
                      __TSdCliMetaRef__: "__TSdCliMetaRef__" as const
                    });
                  }
                }
                else {
                  const nsUseList = this._findNamespaceUse(node.importClause.namedBindings.name.text);
                  for (const nsUse of nsUseList) {
                    result.push({
                      moduleName,
                      name: nsUse,
                      __TSdCliMetaRef__: "__TSdCliMetaRef__" as const
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
                    __TSdCliMetaRef__: "__TSdCliMetaRef__" as const
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
                __TSdCliMetaRef__: "__TSdCliMetaRef__" as const
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

    return fn(this.sourceFile);
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

  private _ngDeclCache?: TSdCliTsNgMetadata;

  public get ngDecl(): TSdCliTsNgMetadata | undefined {
    if (this._ngDeclCache !== undefined) return this._ngDeclCache;

    if (!this._node.decorators) return undefined;

    for (const deco of this._node.decorators) {
      if (!ts.isCallExpression(deco.expression)) continue;
      if (!ts.isIdentifier(deco.expression.expression)) {
        throw new NeverEntryError();
      }

      if (deco.expression.expression.text === "Injectable") {
        this._ngDeclCache = new SdCliTsNgInjectableMetadata(this._fileMeta, deco);
        return this._ngDeclCache;
      }
      else if (deco.expression.expression.text === "Directive") {
        this._ngDeclCache = new SdCliTsNgDirectiveMetadata(this._fileMeta, deco);
        return this._ngDeclCache;
      }
      else if (deco.expression.expression.text === "Component") {
        this._ngDeclCache = new SdCliTsNgComponentMetadata(this._fileMeta, deco);
        return this._ngDeclCache;
      }
      else if (deco.expression.expression.text === "Pipe") {
        this._ngDeclCache = new SdCliTsNgPipeMetadata(this._fileMeta, deco);
        return this._ngDeclCache;
      }
    }

    return undefined;
  }
}

export class SdCliTsObjectMetadata {
  public constructor(private readonly _fileMeta: SdCliTsFileMetadata,
                     private readonly _node: ts.ObjectLiteralExpression) {
  }

  private readonly _getPropValueCache = new Map<string, TSdCliTsMetadata | undefined>();

  public getPropValue(propName: string): TSdCliTsMetadata | undefined {
    if (this._getPropValueCache.has(propName)) {
      return this._getPropValueCache.get(propName);
    }

    const prop = this._node.properties.single((item) => (
      ts.isPropertyAssignment(item) &&
      ts.isIdentifier(item.name) &&
      item.name.text === propName
    )) as ts.PropertyAssignment | undefined;
    if (!prop) {
      this._getPropValueCache.set(propName, undefined);
      return undefined;
    }

    const result = this._fileMeta.getMetaFromNode(prop.initializer);
    this._getPropValueCache.set(propName, result);
    return result;
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

  private _providedInCache?: string;

  public get providedIn(): string | undefined {
    if (this._providedInCache !== undefined) return this._providedInCache;

    if (!ts.isCallExpression(this._node.expression)) throw new NeverEntryError();

    if (this._node.expression.arguments.length > 0 && ts.isObjectLiteralExpression(this._node.expression.arguments[0])) {
      const decoArg = new SdCliTsObjectMetadata(this._fileMeta, this._node.expression.arguments[0]);
      const decoArgSelectorVal = decoArg.getPropValue("providedIn");
      if (typeof decoArgSelectorVal === "string") {
        this._providedInCache = decoArgSelectorVal;
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

  private _selectorCache?: string;

  public get selector(): string {
    if (this._selectorCache !== undefined) return this._selectorCache;

    if (!ts.isCallExpression(this._node.expression)) throw new NeverEntryError();

    if (this._node.expression.arguments.length > 0 && ts.isObjectLiteralExpression(this._node.expression.arguments[0])) {
      const decoArg = new SdCliTsObjectMetadata(this._fileMeta, this._node.expression.arguments[0]);
      const decoArgSelectorVal = decoArg.getPropValue("selector");
      if (typeof decoArgSelectorVal === "string") {
        this._selectorCache = decoArgSelectorVal;
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

  private _selectorCache?: string;

  public get selector(): string {
    if (this._selectorCache !== undefined) return this._selectorCache;

    if (!ts.isCallExpression(this._node.expression)) throw new NeverEntryError();

    if (this._node.expression.arguments.length > 0 && ts.isObjectLiteralExpression(this._node.expression.arguments[0])) {
      const decoArg = new SdCliTsObjectMetadata(this._fileMeta, this._node.expression.arguments[0]);
      const decoArgSelectorVal = decoArg.getPropValue("selector");
      if (typeof decoArgSelectorVal === "string") {
        this._selectorCache = decoArgSelectorVal;
        return decoArgSelectorVal;
      }
    }

    throw new NeverEntryError();
  }

  private _templateCache?: string;

  public get template(): string {
    if (this._templateCache !== undefined) return this._templateCache;

    if (!ts.isCallExpression(this._node.expression)) throw new NeverEntryError();

    if (this._node.expression.arguments.length > 0 && ts.isObjectLiteralExpression(this._node.expression.arguments[0])) {
      const decoArg = new SdCliTsObjectMetadata(this._fileMeta, this._node.expression.arguments[0]);
      const decoArgSelectorVal = decoArg.getPropValue("template");
      if (typeof decoArgSelectorVal === "string") {
        this._templateCache = decoArgSelectorVal;
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

  private _pipeNameCache?: string;

  public get pipeName(): string {
    if (this._pipeNameCache !== undefined) return this._pipeNameCache;

    if (!ts.isCallExpression(this._node.expression)) throw new NeverEntryError();

    if (this._node.expression.arguments.length > 0 && ts.isObjectLiteralExpression(this._node.expression.arguments[0])) {
      const decoArg = new SdCliTsObjectMetadata(this._fileMeta, this._node.expression.arguments[0]);
      const decoArgSelectorVal = decoArg.getPropValue("name");
      if (typeof decoArgSelectorVal === "string") {
        this._pipeNameCache = decoArgSelectorVal;
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
