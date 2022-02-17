import { SdCliBbRootMetadata } from "./SdCliBbRootMetadata";
import {
  Expression,
  isArrayExpression,
  isClassDeclaration,
  isExportDeclaration,
  isExportDefaultDeclaration,
  isExportNamedDeclaration,
  isExportSpecifier,
  isFunctionDeclaration,
  isIdentifier,
  isImportDeclaration,
  isImportNamespaceSpecifier,
  isImportSpecifier,
  isNewExpression,
  isObjectExpression,
  isStringLiteral,
  isVariableDeclaration,
  Statement
} from "@babel/types";
import { FsUtil } from "@simplysm/sd-core-node";
import babelParser from "@babel/parser";
import { NeverEntryError } from "@simplysm/sd-core-common";
import path from "path";
import {
  SdCliBbClassMetadata,
  SdCliBbFunctionMetadata,
  SdCliBbVariableMetadata,
  TSdCliBbDeclarationMetadata
} from "./SdCliBbDeclarationMetadata";
import {
  SdCliBbArrayMetadata,
  SdCliBbNewMetadata,
  SdCliBbObjectMetadata,
  TSdCliBbExpressionMetadata
} from "./SdCliBbExpressionMetadata";

export class SdCliBbFileMetadata {
  public readonly metadata: Statement[] = [];

  public constructor(private readonly _rootMetadata: SdCliBbRootMetadata,
                     public readonly moduleName: string,
                     public readonly filePath: string) {
    const fileContent = FsUtil.readFile(filePath);
    this.metadata = babelParser.parse(fileContent, { sourceType: "module" }).program.body;
  }

  public get exports(): { name: string; declaration: TSdCliBbDeclarationMetadata }[] {
    const result: { name: string; declaration: TSdCliBbDeclarationMetadata }[] = [];
    for (const meta of this.metadata) {
      if (isExportDeclaration(meta)) {
        if (isExportNamedDeclaration(meta)) {
          for (const specifier of meta.specifiers) {
            if (isExportSpecifier(specifier)) {
              if (isIdentifier(specifier.exported)) {
                if (meta.source) {
                  if (meta.source.value.includes(".")) {
                    const moduleFilePath = path.resolve(path.dirname(this.filePath), meta.source.value);
                    result.push({
                      name: specifier.exported.name,
                      declaration: this._rootMetadata.findDeclMeta(this.moduleName, moduleFilePath, specifier.local.name)
                    });
                  }
                  else {
                    const moduleName = meta.source.value;
                    result.push({
                      name: specifier.exported.name,
                      declaration: this._rootMetadata.findDeclMetaByModuleName(moduleName, specifier.local.name)
                    });
                  }
                }
                else {
                  result.push({
                    name: specifier.exported.name,
                    declaration: this.findDeclMeta(specifier.local.name)
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
        else if (isExportDefaultDeclaration(meta)) {
          // throw new NeverEntryError();
        }
        else {
          throw new NeverEntryError();
        }
      }
    }
    return result;
  }

  public findDeclMeta(name: string): TSdCliBbDeclarationMetadata {
    for (const meta of this.metadata) {
      if (isClassDeclaration(meta)) {
        if (meta.id.name === name) {
          return new SdCliBbClassMetadata(this._rootMetadata, this, meta);
        }
      }
      else if (isExportNamedDeclaration(meta)) {
        for (const specifier of meta.specifiers) {
          if (isExportSpecifier(specifier)) {
            if (isIdentifier(specifier.exported)) {
              if (specifier.exported.name === name) {
                if (meta.source) {
                  if (meta.source.value.includes(".")) {
                    const moduleFilePath = path.resolve(path.dirname(this.filePath), meta.source.value);
                    return this._rootMetadata.findDeclMeta(this.moduleName, moduleFilePath, specifier.local.name);
                  }
                  else {
                    const moduleName = meta.source.value;
                    return this._rootMetadata.findDeclMetaByModuleName(moduleName, specifier.local.name);
                  }
                }
                else {
                  return this.findDeclMeta(specifier.local.name);
                }
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
      else if (isImportDeclaration(meta)) {
        for (const specifier of meta.specifiers) {
          if (isImportSpecifier(specifier)) {
            if (specifier.local.name === name) {
              if (isIdentifier(specifier.imported)) {
                if (meta.source.value.includes(".")) {
                  const moduleFilePath = path.resolve(path.dirname(this.filePath), meta.source.value);
                  return this._rootMetadata.findDeclMeta(this.moduleName, moduleFilePath, specifier.imported.name);
                }
                else {
                  const moduleName = meta.source.value;
                  return this._rootMetadata.findDeclMetaByModuleName(moduleName, specifier.imported.name);
                }
              }
              else {
                throw new NeverEntryError();
              }
            }
          }
          else if (isImportNamespaceSpecifier(specifier)) {
            // throw new NeverEntryError();
          }
          else {
            throw new NeverEntryError();
          }
        }
      }
      else if (isFunctionDeclaration(meta)) {
        if (meta.id) {
          if (meta.id.name === name) {
            return new SdCliBbFunctionMetadata(this._rootMetadata, this, meta);
          }
        }
        else {
          throw new NeverEntryError();
        }
      }
      else if (isVariableDeclaration(meta)) {
        for (const decl of meta.declarations) {
          if (isIdentifier(decl.id)) {
            if (decl.id.name === name) {
              return new SdCliBbVariableMetadata(this._rootMetadata, this, decl);
            }
          }
          else {
            throw new NeverEntryError();
          }
        }
      }
    }

    throw new NeverEntryError();
  }

  public getMetaFromExpr(exp: Expression): TSdCliBbValMetadata {
    if (isIdentifier(exp)) {
      const declMeta = this.findDeclMeta(exp.name);
      if (declMeta instanceof SdCliBbVariableMetadata) {
        return declMeta.value;
      }
      else {
        return declMeta;
      }
    }
    else if (isArrayExpression(exp)) {
      return new SdCliBbArrayMetadata(this._rootMetadata, this, exp);
    }
    else if (isObjectExpression(exp)) {
      return new SdCliBbObjectMetadata(this._rootMetadata, this, exp);
    }
    else if (isNewExpression(exp)) {
      return new SdCliBbNewMetadata(this._rootMetadata, this, exp);
    }
    else if (isStringLiteral(exp)) {
      return exp.value;
    }
    else {
      throw new NeverEntryError();
    }
  }
}

export type TSdCliBbValMetadata = SdCliBbClassMetadata | SdCliBbFunctionMetadata | TSdCliBbExpressionMetadata;
