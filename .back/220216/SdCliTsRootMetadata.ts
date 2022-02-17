import ts from "typescript";
import { NeverEntryError } from "@simplysm/sd-core-common";
import path from "path";

export class SdCliTsRootMetadata {
  private readonly _fileMetaMap = new Map<string, SdCliTsFileMetadata>();

  public constructor(private readonly _program: ts.Program) {
    for (const sf of this._program.getSourceFiles()) {
      this._fileMetaMap.set(path.resolve(sf.fileName.replace(/\.[A-z]*$/, "")), new SdCliTsFileMetadata(this, sf));
    }
  }

  public get fileMetas(): SdCliTsFileMetadata[] {
    return Array.from(this._fileMetaMap.values());
  }

  public findDeclMeta(moduleFilePath: string, targetName: string): TSdCliTsDeclarationMetadata {
    const fileMeta = this._fileMetaMap.get(moduleFilePath);
    if (!fileMeta) {
      throw new NeverEntryError();
    }
    return fileMeta.findDeclMeta(targetName);
  }
}

export class SdCliTsFileMetadata {
  public constructor(private readonly _rootMetadata: SdCliTsRootMetadata,
                     private readonly _sourceFile: ts.SourceFile) {
  }

  public get filePath(): string {
    return path.resolve(this._sourceFile.fileName.replace(/\.[A-z]*$/, ""));
  }

  public get exportedClasses(): SdCliTsClassMetadata[] {
    const result: SdCliTsClassMetadata[] = [];
    ts.forEachChild(this._sourceFile, (node) => {
      if (!node.modifiers || !node.modifiers.some((item) => item.kind === ts.SyntaxKind.ExportKeyword)) return;

      if (ts.isClassDeclaration(node)) {
        if (node.name !== undefined) {
          result.push(new SdCliTsClassMetadata(this._rootMetadata, this, node));
        }
        else {
          throw new NeverEntryError();
        }
      }
    });
    return result;
  }

  public get imports(): (TSdCliTsDeclarationMetadata | { moduleName: string; name: string })[] {
    const result: (TSdCliTsDeclarationMetadata | { moduleName: string; name: string })[] = [];

    ts.forEachChild(this._sourceFile, (node) => {
      if (
        ts.isImportDeclaration(node) &&
        node.importClause &&
        node.importClause.namedBindings &&
        ts.isNamedImports(node.importClause.namedBindings)
      ) {
        for (const el of node.importClause.namedBindings.elements) {
          const importedName = el.name.text;

          if (ts.isStringLiteral(node.moduleSpecifier)) {
            if (node.moduleSpecifier.text.includes(".")) {
              const moduleFilePath = path.resolve(path.dirname(this.filePath), node.moduleSpecifier.text);
              result.push(this._rootMetadata.findDeclMeta(moduleFilePath, importedName));
            }
            else {
              result.push({ moduleName: node.moduleSpecifier.text, name: importedName });
            }
          }
          else {
            throw new NeverEntryError();
          }
        }
      }
    });

    return result;
  }

  public getMetaFromExpr(exp: ts.Expression): TSdCliTsValMetadata {
    if (ts.isIdentifier(exp)) {
      return this.findDeclMeta(exp.text);
    }
    else if (ts.isArrayLiteralExpression(exp)) {
      return new SdCliTsArrayMetadata(this._rootMetadata, this, exp);
    }
    else if (ts.isStringLiteral(exp)) {
      return exp.text;
    }
    else {
      throw new NeverEntryError();
    }
  }

  public findDeclMeta(name: string): TSdCliTsDeclarationMetadata {
    const result = ts.forEachChild(this._sourceFile, (node) => {
      if (
        ts.isClassDeclaration(node) &&
        node.name?.text === name
      ) {
        return new SdCliTsClassMetadata(this._rootMetadata, this, node);
      }
      else if (
        ts.isImportDeclaration(node) &&
        node.importClause &&
        node.importClause.namedBindings &&
        ts.isNamedImports(node.importClause.namedBindings)
      ) {
        for (const el of node.importClause.namedBindings.elements) {
          const localName = el.propertyName?.text ?? el.name.text;
          if (localName !== name) continue;

          const importedName = el.name.text;

          if (ts.isStringLiteral(node.moduleSpecifier)) {
            if (node.moduleSpecifier.text.includes(".")) {
              const moduleFilePath = path.resolve(path.dirname(this.filePath), node.moduleSpecifier.text);
              return this._rootMetadata.findDeclMeta(moduleFilePath, importedName);
            }
            else {
              return { moduleName: node.moduleSpecifier.text, name: importedName };
            }
          }
          else {
            throw new NeverEntryError();
          }
        }
      }

      return undefined;
    });

    if (result === undefined) {
      throw new NeverEntryError();
    }

    return result;
  }
}


export class SdCliTsClassMetadata {
  public constructor(private readonly _rootMetadata: SdCliTsRootMetadata,
                     private readonly _fileMetadata: SdCliTsFileMetadata,
                     private readonly _metadata: ts.ClassDeclaration) {
  }

  public get filePath(): string {
    return this._fileMetadata.filePath;
  }

  public get name(): string {
    if (this._metadata.name === undefined) {
      throw new NeverEntryError();
    }
    return this._metadata.name.text;
  }

  public get ngDecl(): TSdCliTsNgDeclMetadata | undefined {
    const modDeco = this.getDecorator("NgModule");
    if (modDeco) return new SdCliTsNgModuleDeclMetadata(this._rootMetadata, this._fileMetadata, this);

    const injDeco = this.getDecorator("Injectable");
    if (injDeco) return new SdCliTsNgInjectableDeclMetadata(this._rootMetadata, this._fileMetadata, this);

    const dirDeco = this.getDecorator("Directive");
    if (dirDeco) return new SdCliTsNgDirectiveDeclMetadata(this._rootMetadata, this._fileMetadata, this);

    const cmpDeco = this.getDecorator("Component");
    if (cmpDeco) return new SdCliTsNgComponentDeclMetadata(this._rootMetadata, this._fileMetadata, this);

    const pipeDeco = this.getDecorator("Pipe");
    if (pipeDeco) return new SdCliTsNgPipeDeclMetadata(this._rootMetadata, this._fileMetadata, this);

    return undefined;
  }

  public getDecorator(name: string): ts.CallExpression | undefined {
    if (!this._metadata.decorators) return undefined;

    for (const dec of this._metadata.decorators) {
      if (!ts.isCallExpression(dec.expression)) continue;
      if (!ts.isIdentifier(dec.expression.expression)) continue;

      if (dec.expression.expression.text === name) {
        return dec.expression;
      }
    }

    return undefined;
  }
}

export class SdCliTsObjectMetadata {
  public constructor(private readonly _rootMetadata: SdCliTsRootMetadata,
                     private readonly _fileMetadata: SdCliTsFileMetadata,
                     private readonly _metadata: ts.ObjectLiteralExpression) {
  }

  public getPropValue(propName: string): TSdCliTsValMetadata | undefined {
    const prop = this._metadata.properties.single((item) => (
      ts.isPropertyAssignment(item) &&
      ts.isIdentifier(item.name) &&
      item.name.text === propName
    )) as ts.PropertyAssignment | undefined;
    if (!prop) return undefined;

    return this._fileMetadata.getMetaFromExpr(prop.initializer);
  }
}

export class SdCliTsArrayMetadata {
  public constructor(private readonly _rootMetadata: SdCliTsRootMetadata,
                     private readonly _fileMetadata: SdCliTsFileMetadata,
                     private readonly _metadata: ts.ArrayLiteralExpression) {
  }

  public get value(): TSdCliTsValMetadata[] {
    let result: TSdCliTsValMetadata[] = [];
    for (const el of this._metadata.elements) {
      result.push(this._fileMetadata.getMetaFromExpr(el));
    }
    return result;
  }
}


export type TSdCliTsDeclarationMetadata =
  SdCliTsClassMetadata
  | SdCliTsObjectMetadata
  | SdCliTsArrayMetadata
  | { moduleName: string; name: string };

export type TSdCliTsValMetadata = TSdCliTsDeclarationMetadata | string;

export class SdCliTsNgModuleDeclMetadata {
  public constructor(private readonly _rootMetadata: SdCliTsRootMetadata,
                     private readonly _fileMetadata: SdCliTsFileMetadata,
                     private readonly _classMetadata: SdCliTsClassMetadata) {
  }

  public get def(): { exports: SdCliTsClassMetadata[]; providers: SdCliTsClassMetadata[] } {
    const result: { exports: SdCliTsClassMetadata[]; providers: SdCliTsClassMetadata[] } = {
      exports: [],
      providers: []
    };

    const modDeco = this._classMetadata.getDecorator("NgModule");
    if (!modDeco) throw new NeverEntryError();

    if (modDeco.arguments.length > 0 && ts.isObjectLiteralExpression(modDeco.arguments[0])) {
      const modDecoArg = new SdCliTsObjectMetadata(this._rootMetadata, this._fileMetadata, modDeco.arguments[0]);
      const modDecoArgExpVal = modDecoArg.getPropValue("exports");
      if (modDecoArgExpVal !== undefined) {
        if (modDecoArgExpVal instanceof SdCliTsArrayMetadata) {
          for (const modDecoArgExpValVal of modDecoArgExpVal.value) {
            if (modDecoArgExpValVal instanceof SdCliTsClassMetadata) {
              result.exports.push(modDecoArgExpValVal);
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

      const modDecoArgProvVal = modDecoArg.getPropValue("providers");
      if (modDecoArgProvVal !== undefined) {
        if (modDecoArgProvVal instanceof SdCliTsArrayMetadata) {
          for (const modDecoArgProvValVal of modDecoArgProvVal.value) {
            if (modDecoArgProvValVal instanceof SdCliTsClassMetadata) {
              result.exports.push(modDecoArgProvValVal);
            }
            else {
              throw new NeverEntryError();
            }
          }
        }
      }
    }
    else {
      throw new NeverEntryError();
    }

    return result;
  }
}

export class SdCliTsNgInjectableDeclMetadata {
  public constructor(private readonly _rootMetadata: SdCliTsRootMetadata,
                     private readonly _fileMetadata: SdCliTsFileMetadata,
                     private readonly _classMetadata: SdCliTsClassMetadata) {
  }
}

export class SdCliTsNgDirectiveDeclMetadata {
  public constructor(private readonly _rootMetadata: SdCliTsRootMetadata,
                     private readonly _fileMetadata: SdCliTsFileMetadata,
                     private readonly _classMetadata: SdCliTsClassMetadata) {
  }

  public get selector(): string {
    const deco = this._classMetadata.getDecorator("Directive");
    if (!deco) throw new NeverEntryError();

    if (deco.arguments.length > 0 && ts.isObjectLiteralExpression(deco.arguments[0])) {
      const decoArg = new SdCliTsObjectMetadata(this._rootMetadata, this._fileMetadata, deco.arguments[0]);
      const decoArgSelectorVal = decoArg.getPropValue("selector");
      if (typeof decoArgSelectorVal === "string") {
        return decoArgSelectorVal;
      }
    }

    throw new NeverEntryError();
  }
}

export class SdCliTsNgComponentDeclMetadata {
  public constructor(private readonly _rootMetadata: SdCliTsRootMetadata,
                     private readonly _fileMetadata: SdCliTsFileMetadata,
                     private readonly _classMetadata: SdCliTsClassMetadata) {
  }

  public get selector(): string {
    const deco = this._classMetadata.getDecorator("Component");
    if (!deco) throw new NeverEntryError();

    if (deco.arguments.length > 0 && ts.isObjectLiteralExpression(deco.arguments[0])) {
      const decoArg = new SdCliTsObjectMetadata(this._rootMetadata, this._fileMetadata, deco.arguments[0]);
      const decoArgSelectorVal = decoArg.getPropValue("selector");
      if (typeof decoArgSelectorVal === "string") {
        return decoArgSelectorVal;
      }
    }

    throw new NeverEntryError();
  }


  public get template(): string {
    const deco = this._classMetadata.getDecorator("Component");
    if (!deco) throw new NeverEntryError();

    if (deco.arguments.length > 0 && ts.isObjectLiteralExpression(deco.arguments[0])) {
      const decoArg = new SdCliTsObjectMetadata(this._rootMetadata, this._fileMetadata, deco.arguments[0]);
      const decoArgSelectorVal = decoArg.getPropValue("template");
      if (typeof decoArgSelectorVal === "string") {
        return decoArgSelectorVal;
      }
    }

    throw new NeverEntryError();
  }
}

export class SdCliTsNgPipeDeclMetadata {
  public constructor(private readonly _rootMetadata: SdCliTsRootMetadata,
                     private readonly _fileMetadata: SdCliTsFileMetadata,
                     private readonly _classMetadata: SdCliTsClassMetadata) {
  }

  public get name(): string {
    const deco = this._classMetadata.getDecorator("Pipe");
    if (!deco) throw new NeverEntryError();

    if (deco.arguments.length > 0 && ts.isObjectLiteralExpression(deco.arguments[0])) {
      const decoArg = new SdCliTsObjectMetadata(this._rootMetadata, this._fileMetadata, deco.arguments[0]);
      const decoArgSelectorVal = decoArg.getPropValue("name");
      if (typeof decoArgSelectorVal === "string") {
        return decoArgSelectorVal;
      }
    }

    throw new NeverEntryError();
  }
}

export type TSdCliTsNgDeclMetadata =
  SdCliTsNgModuleDeclMetadata
  | SdCliTsNgInjectableDeclMetadata
  | SdCliTsNgDirectiveDeclMetadata
  | SdCliTsNgComponentDeclMetadata
  | SdCliTsNgPipeDeclMetadata;
