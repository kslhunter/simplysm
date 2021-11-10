import * as ts from "typescript";
import { NeverEntryError } from "@simplysm/sd-core-common";
import { PathUtil } from "@simplysm/sd-core-node";
import { SdMetadataError } from "./SdMetadataError";

export class SdMyMetadataReader {
  private readonly _typeChecker: ts.TypeChecker;

  public constructor(private readonly _sourceFile: ts.SourceFile,
                     private readonly _program: ts.Program) {
    this._typeChecker = this._program.getTypeChecker();
  }

  public getMetadatas(): TMyNgMetadata[] {
    const result: TMyNgMetadata[] = [];

    ts.forEachChild(this._sourceFile, (node) => {
      if (!ts.isClassDeclaration(node) || !node.name) return;
      if (!node.modifiers || !node.modifiers.some((item) => item.kind === ts.SyntaxKind.ExportKeyword)) return;
      const className = node.name.text;

      const ngModuleDec = this._getDecorator(node, "NgModule");
      if (ngModuleDec) {
        const decParam = this._getNgModuleDecoratorParam(ngModuleDec);
        const staticProviders = this._getNgModuleStaticProviders(node);

        result.push({
          type: "NgModule",
          className,
          exports: decParam.exports,
          providers: [
            ...decParam.providers,
            ...staticProviders
          ]
        });
      }

      const injectableDec = this._getDecorator(node, "Injectable");
      if (injectableDec) {
        result.push({
          type: "Injectable",
          className,
          moduleImports: this._getModuleImports(),
          ...this._getInjectableDecoratorParam(injectableDec)
        });
      }

      const directiveDec = this._getDecorator(node, "Directive");
      if (directiveDec) {
        result.push({
          type: "Directive",
          className,
          moduleImports: this._getModuleImports(),
          ...this._getDirectiveDecoratorParam(directiveDec)
        });
      }

      const pipeDec = this._getDecorator(node, "Pipe");
      if (pipeDec) {
        result.push({
          type: "Pipe",
          className,
          moduleImports: this._getModuleImports(),
          ...this._getPipeDecoratorParam(pipeDec)
        });
      }

      const componentDec = this._getDecorator(node, "Component");
      if (componentDec) {
        result.push({
          type: "Component",
          className,
          moduleImports: this._getModuleImports(),
          ...this._getComponentDecoratorParam(componentDec)
        });
      }
    });

    return result;
  }

  private _getDecorator(node: ts.ClassDeclaration, name: string): ts.CallExpression | undefined {
    if (!node.decorators) return undefined;

    for (const dec of node.decorators) {
      if (!ts.isCallExpression(dec.expression)) continue;
      if (!ts.isIdentifier(dec.expression.expression)) continue;

      if (dec.expression.expression.text === name) {
        return dec.expression;
      }
    }

    return undefined;
  }

  private _getModuleImports(): IMyModuleImport[] {
    const result: IMyModuleImport[] = [];

    ts.forEachChild(this._sourceFile, (node) => {
      if (!ts.isImportDeclaration(node) && !ts.isImportEqualsDeclaration(node) && !ts.isExportDeclaration(node)) return;

      if (ts.isImportDeclaration(node)) {
        const importNamedBindings = node.importClause?.namedBindings;
        if (importNamedBindings && ts.isNamedImports(importNamedBindings)) {
          for (const el of importNamedBindings.elements) {
            result.push(this._getAliasedModuleImportInfo(el.name));
          }
        }
        else {
          result.push(...this._getAliasedModuleImportsInfoForAllExports(node.moduleSpecifier));
        }
      }
      else if (ts.isExportDeclaration(node)) {
        const exportNamedBindings = node.exportClause;
        if (exportNamedBindings && ts.isNamedExports(exportNamedBindings)) {
          for (const el of exportNamedBindings.elements) {
            result.push(this._getAliasedModuleImportInfo(el.name));
          }
        }
        else if (node.moduleSpecifier) {
          result.push(...this._getAliasedModuleImportsInfoForAllExports(node.moduleSpecifier));
        }
        else {
          throw new NeverEntryError();
        }
      }
    });

    return result;
  }

  private _getAliasedModuleImportsInfoForAllExports(expression: ts.Expression): IMyModuleImport[] {
    const moduleSymbol = this._typeChecker.getSymbolAtLocation(expression);
    if (!moduleSymbol) throw new NeverEntryError();
    const declarations = moduleSymbol.getDeclarations();
    if (!declarations || declarations.length !== 1) throw new NeverEntryError();
    const moduleFilePath = PathUtil.posix(declarations[0].getSourceFile().fileName);
    if (!moduleSymbol.exports) throw new NeverEntryError();

    return Array.from(moduleSymbol.exports.keys() as any).map((key) => ({ name: key as string, moduleFilePath }));
  }

  private _getAliasedModuleImportInfo(identifier: ts.Identifier): IMyModuleImport {
    const moduleSymbol = this._typeChecker.getSymbolAtLocation(identifier);
    if (!moduleSymbol) throw new NeverEntryError();
    if (moduleSymbol.valueDeclaration) {
      const moduleFilePath = PathUtil.posix(moduleSymbol.valueDeclaration.getSourceFile().fileName);
      return { name: identifier.text, moduleFilePath };
    }
    else {
      const aliasedTargetSymbol = this._typeChecker.getAliasedSymbol(moduleSymbol);
      const declarations = aliasedTargetSymbol.getDeclarations();
      if (!declarations || declarations.length < 1) {
        throw new SdMetadataError(this._sourceFile.fileName, `'${identifier.text}'를 찾을 수 없습니다.`);
      }

      if (declarations.length === 1) {
        return { name: identifier.text, moduleFilePath: PathUtil.posix(declarations[0].getSourceFile().fileName) };
      }

      const moduleFilePaths = declarations
        .filter((item) => this._hasParentsOrMe(item, (item1) => Boolean(item1.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword))))
        .map((item) => PathUtil.posix(item.getSourceFile().fileName))
        .distinct();
      if (moduleFilePaths.length === 0) {
        throw new SdMetadataError(this._sourceFile.fileName, `'${identifier.text}'의 경로를 찾을 수 없습니다.`);
      }
      if (moduleFilePaths.length !== 1) {
        throw new SdMetadataError(this._sourceFile.fileName, `'${identifier.text}'의 경로가 중복되었습니다.\n${moduleFilePaths.join("\n")}`);
      }

      const moduleFilePath = moduleFilePaths[0];

      return { name: identifier.text, moduleFilePath };
    }
  }

  private _hasParentsOrMe(node: ts.Node, fn: (node1: ts.Node) => boolean): boolean {
    let currNode = node as ts.Node | undefined;
    while (true) {
      if (!currNode) return false;

      const result = fn(currNode);
      if (result) return true;

      currNode = currNode.parent as ts.Node | undefined;
    }
  }

  private _getNgModuleDecoratorParam(decExp: ts.CallExpression): { exports: IMyModuleImport[]; providers: IMyModuleImport[] } {
    const result: { exports: IMyModuleImport[]; providers: IMyModuleImport[] } = {
      exports: [],
      providers: []
    };

    if (decExp.arguments.length === 0 || !ts.isObjectLiteralExpression(decExp.arguments[0])) {
      throw new NeverEntryError();
    }

    const exportsPropInitializer = this._getObjectPropertyValueInitializer(decExp.arguments[0], "exports");
    if (exportsPropInitializer) {
      if (ts.isArrayLiteralExpression(exportsPropInitializer)) {
        for (const el of exportsPropInitializer.elements) {
          if (ts.isIdentifier(el)) {
            result.exports.push(this._getAliasedModuleImportInfo(el));
          }
          else {
            throw new NeverEntryError();
          }
        }
      }
      else {
        throw new NeverEntryError();
      }
    }

    const providersPropInitializer = this._getObjectPropertyValueInitializer(decExp.arguments[0], "providers");
    if (providersPropInitializer) {
      result.providers.push(...this._getProviders(providersPropInitializer));
    }

    return result;
  }

  private _getProviders(initializer: ts.Expression): IMyModuleImport[] {
    const result: IMyModuleImport[] = [];

    if (ts.isArrayLiteralExpression(initializer)) {
      for (const el of initializer.elements) {
        result.push(...this._getProviders(el));
      }
    }
    else if (ts.isObjectLiteralExpression(initializer)) {
      const propInitializer = this._getObjectPropertyValueInitializer(initializer, "provide");
      if (propInitializer) {
        result.push(...this._getProviders(propInitializer));
      }
    }
    else if (ts.isIdentifier(initializer)) {
      result.push(this._getAliasedModuleImportInfo(initializer));
    }
    else {
      throw new NeverEntryError();
    }

    return result;
  }

  private _getInjectableDecoratorParam(decExp: ts.CallExpression): { providedIn?: string } {
    const result: { providedIn?: string } = {};

    if (decExp.arguments.length !== 0) {
      if (!ts.isObjectLiteralExpression(decExp.arguments[0])) {
        throw new NeverEntryError();
      }

      const providersPropInitializer = this._getObjectPropertyValueInitializer(decExp.arguments[0], "providedIn");
      if (providersPropInitializer) {
        result.providedIn = this._getExpStringValue(providersPropInitializer);
      }
    }

    return result;
  }

  private _getDirectiveDecoratorParam(decExp: ts.CallExpression): { selector?: string } {
    const result: { selector?: string } = {};

    if (decExp.arguments.length === 0 || !ts.isObjectLiteralExpression(decExp.arguments[0])) {
      throw new NeverEntryError();
    }

    const selectorPropInitializer = this._getObjectPropertyValueInitializer(decExp.arguments[0], "selector");
    if (selectorPropInitializer) {
      result.selector = this._getExpStringValue(selectorPropInitializer);
    }

    return result;
  }

  private _getPipeDecoratorParam(decExp: ts.CallExpression): { name?: string } {
    const result: { name?: string } = {};

    if (decExp.arguments.length === 0 || !ts.isObjectLiteralExpression(decExp.arguments[0])) {
      throw new NeverEntryError();
    }

    const namePropInitializer = this._getObjectPropertyValueInitializer(decExp.arguments[0], "name");
    if (namePropInitializer) {
      result.name = this._getExpStringValue(namePropInitializer);
    }

    return result;
  }

  private _getComponentDecoratorParam(decExp: ts.CallExpression): { selector?: string; template?: string } {
    const result: { selector?: string; template?: string } = {};

    if (decExp.arguments.length === 0 || !ts.isObjectLiteralExpression(decExp.arguments[0])) {
      throw new NeverEntryError();
    }

    const selectorPropInitializer = this._getObjectPropertyValueInitializer(decExp.arguments[0], "selector");
    if (selectorPropInitializer) {
      result.selector = this._getExpStringValue(selectorPropInitializer);
    }

    const templatePropInitializer = this._getObjectPropertyValueInitializer(decExp.arguments[0], "template");
    if (templatePropInitializer) {
      result.template = this._getExpStringValue(templatePropInitializer);
    }

    return result;
  }

  private _getExpStringValue(exp: ts.Expression): string | undefined {
    if (ts.isStringLiteral(exp) || ts.isNoSubstitutionTemplateLiteral(exp)) {
      return exp.text;
    }
    else if (exp.kind === ts.SyntaxKind.NullKeyword) {
      return undefined;
    }
    else {
      throw new NeverEntryError();
    }
  }

  private _getObjectPropertyValueInitializer(node: ts.ObjectLiteralExpression, propName: string): ts.Expression | undefined {
    for (const prop of node.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      if (!ts.isIdentifier(prop.name)) continue;

      if (prop.name.text === propName) {
        return prop.initializer;
      }
    }

    return undefined;
  }

  private _getNgModuleStaticProviders(node: ts.ClassDeclaration): IMyModuleImport[] {
    const result: IMyModuleImport[] = [];

    for (const member of node.members) {
      if (!member.modifiers || !member.modifiers.some((item) => item.kind === ts.SyntaxKind.StaticKeyword) || !ts.isMethodDeclaration(member)) continue;
      if (!member.body) throw new NeverEntryError();
      const returnStat = member.body.statements.single((item) => ts.isReturnStatement(item));
      if (!returnStat || !ts.isReturnStatement(returnStat) || !returnStat.expression) throw new NeverEntryError();
      if (!ts.isObjectLiteralExpression(returnStat.expression)) throw new NeverEntryError();
      const providersPropInitializer = this._getObjectPropertyValueInitializer(returnStat.expression, "providers");
      if (providersPropInitializer) {
        result.push(...this._getProviders(providersPropInitializer));
      }
    }

    return result;
  }
}

export type TMyNgMetadata =
  IMyNgModuleMetadata
  | IMyInjectableMetadata
  | IMyDirectiveMetadata
  | IMyPipeMetadata
  | IMyComponentMetadata;

export interface IMyNgModuleMetadata {
  type: "NgModule";
  className: string;
  exports: IMyModuleImport[];
  providers: IMyModuleImport[];
}

export interface IMyInjectableMetadata {
  type: "Injectable";
  moduleImports: IMyModuleImport[];
  className: string;
  providedIn?: string;
}

export interface IMyDirectiveMetadata {
  type: "Directive";
  moduleImports: IMyModuleImport[];
  className: string;
  selector?: string;
}

export interface IMyPipeMetadata {
  type: "Pipe";
  moduleImports: IMyModuleImport[];
  className: string;
  name?: string;
}

export interface IMyComponentMetadata {
  type: "Component";
  moduleImports: IMyModuleImport[];
  className: string;
  selector?: string;
  template?: string;
}

export interface IMyModuleImport {
  moduleFilePath: string;
  name: string;
}
