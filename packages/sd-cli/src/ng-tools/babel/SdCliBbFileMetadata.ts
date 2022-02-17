import {
  Declaration,
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
  isImportSpecifier,
  isObjectExpression,
  isSpreadElement,
  isStringLiteral,
  isVariableDeclaration,
  PatternLike,
  SpreadElement,
  Statement
} from "@babel/types";
import babelParser from "@babel/parser";
import { FsUtil } from "@simplysm/sd-core-node";
import { NeverEntryError } from "@simplysm/sd-core-common";
import path from "path";
import { TSdCliBbMetadata } from "./SdCliBbRootMetadata";
import {
  SdCliBbArrayMetadata,
  SdCliBbClassMetadata,
  SdCliBbFunctionMetadata,
  SdCliBbObjectMetadata,
  SdCliBbVariableMetadata
} from "./TSdCliBbTypeMetadata";

export class SdCliBbFileMetadata {
  public readonly rawMetas: Statement[] = [];

  public constructor(public readonly filePath: string) {
    const fileContent = FsUtil.readFile(filePath);
    this.rawMetas = babelParser.parse(fileContent, { sourceType: "module" }).program.body;
  }

  private _exportMap?: Map<string, TSdCliBbMetadata>;

  public get exportMap(): Map<string, TSdCliBbMetadata> {
    if (this._exportMap) return this._exportMap;

    const result = new Map<string, TSdCliBbMetadata>();
    for (const rawMeta of this.rawMetas) {
      if (!isExportDeclaration(rawMeta)) continue;

      if (isExportNamedDeclaration(rawMeta)) {
        for (const specifier of rawMeta.specifiers) {
          if (isExportSpecifier(specifier)) {
            const exportedName = isIdentifier(specifier.exported) ? specifier.exported.name : undefined;
            if (exportedName === undefined) {
              throw new NeverEntryError();
            }

            if (rawMeta.source) {
              if (rawMeta.source.value.includes(".")) {
                const moduleFilePath = path.resolve(path.dirname(this.filePath), rawMeta.source.value);
                result.set(exportedName, {
                  filePath: moduleFilePath,
                  name: specifier.local.name,
                  __TDeclRef__: "__TDeclRef__"
                });
              }
              else {
                const moduleName = rawMeta.source.value;
                result.set(exportedName, { moduleName, name: specifier.local.name, __TDeclRef__: "__TDeclRef__" });
              }
            }
            else {
              result.set(exportedName, this._findMetaFromInside(specifier.local.name));
            }
          }
          else {
            throw new NeverEntryError();
          }
        }
      }
      else if (isExportDefaultDeclaration(rawMeta)) {
        result.set("default", this.getMetaFromRaw(rawMeta.declaration));
      }
      else {
        throw new NeverEntryError();
      }
    }

    this._exportMap = result;
    return result;
  }

  private readonly _findMetaFromOutsideCache = new Map<string, TSdCliBbMetadata>();

  public findMetaFromOutside(name: string): TSdCliBbMetadata {
    const cache = this._findMetaFromOutsideCache.get(name);
    if (cache !== undefined) return cache;

    for (const rawMeta of this.rawMetas) {
      if (isExportNamedDeclaration(rawMeta)) {
        for (const specifier of rawMeta.specifiers) {
          if (isExportSpecifier(specifier)) {
            const exportedName = isIdentifier(specifier.exported) ? specifier.exported.name : undefined;
            if (exportedName === undefined) {
              throw new NeverEntryError();
            }
            else if (exportedName === name) {
              if (rawMeta.source) {
                if (rawMeta.source.value.includes(".")) {
                  const moduleFilePath = path.resolve(path.dirname(this.filePath), rawMeta.source.value);
                  const result = {
                    filePath: moduleFilePath,
                    name: specifier.local.name,
                    __TDeclRef__: "__TDeclRef__" as const
                  };
                  this._findMetaFromOutsideCache.set(name, result);
                  return result;
                }
                else {
                  const moduleName = rawMeta.source.value;
                  const result = {
                    moduleName,
                    name: specifier.local.name,
                    __TDeclRef__: "__TDeclRef__" as const
                  };
                  this._findMetaFromOutsideCache.set(name, result);
                  return result;
                }
              }
              else {
                const result = this._findMetaFromInside(specifier.local.name);
                this._findMetaFromOutsideCache.set(name, result);
                return result;
              }
            }
          }
        }
      }
      else if (isExportDefaultDeclaration(rawMeta) && name === "default") {
        const result = this.getMetaFromRaw(rawMeta.declaration);
        if (Array.isArray(result)) {
          throw new NeverEntryError();
        }
        this._findMetaFromOutsideCache.set(name, result);
        return result;
      }
    }

    throw new NeverEntryError();
  }

  private readonly _findMetaFromInsideCache = new Map<string, TSdCliBbMetadata>();

  private _findMetaFromInside(localName: string): TSdCliBbMetadata {
    const cache = this._findMetaFromInsideCache.get(localName);
    if (cache !== undefined) return cache;

    for (const rawMeta of this.rawMetas) {
      if (isClassDeclaration(rawMeta) && rawMeta.id.name === localName) {
        return new SdCliBbClassMetadata(this, rawMeta);
      }
      else if (isExportNamedDeclaration(rawMeta)) {
        for (const specifier of rawMeta.specifiers) {
          if (isExportSpecifier(specifier)) {
            const exportedName = isIdentifier(specifier.exported) ? specifier.exported.name : undefined;
            if (exportedName === undefined) {
              throw new NeverEntryError();
            }
            else if (exportedName === localName) {
              if (rawMeta.source) {
                if (rawMeta.source.value.includes(".")) {
                  const moduleFilePath = path.resolve(path.dirname(this.filePath), rawMeta.source.value);
                  const result = {
                    filePath: moduleFilePath,
                    name: specifier.local.name,
                    __TDeclRef__: "__TDeclRef__" as const
                  };
                  this._findMetaFromInsideCache.set(localName, result);
                  return result;
                }
                else {
                  const moduleName = rawMeta.source.value;
                  const result = {
                    moduleName,
                    name: specifier.local.name,
                    __TDeclRef__: "__TDeclRef__" as const
                  };
                  this._findMetaFromInsideCache.set(localName, result);
                  return result;
                }
              }
            }
          }
        }
      }
      /*else if (isExportDefaultDeclaration(rawMeta) && localName === "default") {
        const result = this.getMetaFromRaw(rawMeta.declaration);
        if (Array.isArray(result)) {
          throw new NeverEntryError();
        }
        this._findMetaFromInsideCache.set(localName, result);
        return result;
      }*/
      else if (isImportDeclaration(rawMeta)) {
        for (const specifier of rawMeta.specifiers) {
          if (isImportSpecifier(specifier)) {
            const impLocalName = isIdentifier(specifier.local) ? specifier.local.name : undefined;
            if (impLocalName === undefined) {
              throw new NeverEntryError();
            }
            else if (impLocalName === localName) {
              if (isIdentifier(specifier.imported)) {
                if (rawMeta.source.value.includes(".")) {
                  const moduleFilePath = path.resolve(path.dirname(this.filePath), rawMeta.source.value);
                  const result = {
                    filePath: moduleFilePath,
                    name: specifier.imported.name,
                    __TDeclRef__: "__TDeclRef__" as const
                  };
                  this._findMetaFromInsideCache.set(localName, result);
                  return result;
                }
                else {
                  const moduleName = rawMeta.source.value;
                  const result = {
                    moduleName,
                    name: specifier.imported.name,
                    __TDeclRef__: "__TDeclRef__" as const
                  };
                  this._findMetaFromInsideCache.set(localName, result);
                  return result;
                }
              }
              else {
                throw new NeverEntryError();
              }
            }
          }
        }
      }
      else if (isVariableDeclaration(rawMeta)) {
        for (const decl of rawMeta.declarations) {
          if (isIdentifier(decl.id)) {
            if (decl.id.name === localName) {
              const result = new SdCliBbVariableMetadata(this, decl);
              this._findMetaFromInsideCache.set(localName, result);
              return result;
            }
          }
          else {
            throw new NeverEntryError();
          }
        }
      }
      else if (isFunctionDeclaration(rawMeta)) {
        if (rawMeta.id) {
          if (rawMeta.id.name === localName) {
            const result = new SdCliBbFunctionMetadata(this, rawMeta);
            this._findMetaFromInsideCache.set(localName, result);
            return result;
          }
        }
        else {
          throw new NeverEntryError();
        }
      }
    }

    throw new NeverEntryError();
  }

  public getMetaFromRaw(rawMeta: Declaration | Expression | PatternLike | SpreadElement): TSdCliBbMetadata {
    if (isIdentifier(rawMeta)) {
      return this._findMetaFromInside(rawMeta.name);
    }
    else if (isClassDeclaration(rawMeta)) {
      return new SdCliBbClassMetadata(this, rawMeta);
    }
    else if (isArrayExpression(rawMeta)) {
      return new SdCliBbArrayMetadata(this, rawMeta);
    }
    else if (isObjectExpression(rawMeta)) {
      return new SdCliBbObjectMetadata(this, rawMeta);
    }
    else if (isStringLiteral(rawMeta)) {
      return rawMeta.value;
    }
    else if (isSpreadElement(rawMeta)) {
      return this.getMetaFromRaw(rawMeta.argument);
    }
    // else if (isExportNamedDeclaration(rawMeta)) {
    //   for (const specifier of rawMeta.specifiers) {
    //     if (isExportSpecifier(specifier)) {
    //       const exportedName = isIdentifier(specifier.exported) ? specifier.exported.name : undefined;
    //       if (exportedName === undefined) {
    //         throw new NeverEntryError();
    //       }
    //
    //       const exports: IExportMeta[] = [];
    //       if (rawMeta.source) {
    //         if (rawMeta.source.value.includes(".")) {
    //           const moduleFilePath = path.resolve(path.dirname(this.filePath), rawMeta.source.value);
    //           exports.push({
    //             exportedName,
    //             target: { filePath: moduleFilePath, name: specifier.local.name, __TDeclRef__: "__TDeclRef__" }
    //           });
    //         }
    //         else {
    //           const moduleName = rawMeta.source.value;
    //           exports.push({
    //             exportedName,
    //             target: { moduleName, name: specifier.local.name, __TDeclRef__: "__TDeclRef__" }
    //           });
    //         }
    //       }
    //       else {
    //         exports.push({
    //           exportedName,
    //           target: this._findMetaFromInside(specifier.local.name)
    //         });
    //       }
    //
    //       return exports;
    //     }
    //   }
    // }
    // else if (isExportDefaultDeclaration(rawMeta)) {
    //   return this._getMetaFromRaw(rawMeta.declaration);
    // }

    throw new NeverEntryError();
  }

  // public getRefFromMeta(meta: TBbMetadata | TDeclRef): TDeclRef {
  //   if (meta instanceof SdCliBbClassMetadata) {
  //     return {
  //       filePath: meta.filePath,
  //       name: meta.name,
  //       __TDeclRef__: "__TDeclRef__"
  //     };
  //   }
  //   else if ("__TDeclRef__" in meta) {
  //     return meta;
  //   }
  //   else if (meta instanceof SdCliBbFunctionMetadata) {
  //     return {
  //       filePath: meta.filePath,
  //       name: meta.name,
  //       __TDeclRef__: "__TDeclRef__"
  //     };
  //   }
  //   else if (meta instanceof SdCliBbVariableMetadata) {
  //     return {
  //       filePath: meta.filePath,
  //       name: meta.name,
  //       __TDeclRef__: "__TDeclRef__"
  //     };
  //   }
  //   else {
  //     throw new NeverEntryError();
  //   }
  // }
}
