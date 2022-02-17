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
import path from "path";
import { TSdCliBbMetadata } from "./SdCliBbRootMetadata";
import {
  SdCliBbArrayMetadata,
  SdCliBbClassMetadata,
  SdCliBbFunctionMetadata,
  SdCliBbObjectMetadata,
  SdCliBbVariableMetadata
} from "./TSdCliBbTypeMetadata";
import { SdCliBbUtil } from "./SdCliBbUtil";

export class SdCliBbFileMetadata {
  public readonly rawMetas: Statement[] = [];

  public constructor(public readonly filePath: string) {
    let realFilePath: string | undefined;
    for (const ext of ["", ".mjs", ".cjs", ".js"]) {
      if (FsUtil.exists(filePath + ext) && !FsUtil.isDirectory(filePath + ext)) {
        realFilePath = filePath + ext;
        break;
      }
    }
    if (realFilePath === undefined) {
      throw SdCliBbUtil.error("파일을 찾을 수 없습니다.", filePath);
    }

    const fileContent = FsUtil.readFile(realFilePath);
    this.rawMetas = babelParser.parse(fileContent, { sourceType: "module" }).program.body;
  }

  private _exportsCache?: { exportedName: string; target: TSdCliBbMetadata }[];

  public get exports(): { exportedName: string; target: TSdCliBbMetadata }[] {
    if (this._exportsCache) return this._exportsCache;

    const result: { exportedName: string; target: TSdCliBbMetadata }[] = [];
    for (const rawMeta of this.rawMetas) {
      if (!isExportDeclaration(rawMeta)) continue;

      if (isExportNamedDeclaration(rawMeta)) {
        for (const specifier of rawMeta.specifiers) {
          if (isExportSpecifier(specifier)) {
            const exportedName = isIdentifier(specifier.exported) ? specifier.exported.name : undefined;
            if (exportedName === undefined) {
              throw SdCliBbUtil.error("예상치 못한 방식의 코드가 발견되었습니다.", this.filePath, rawMeta);
            }

            if (rawMeta.source) {
              if (rawMeta.source.value.includes(".")) {
                const moduleFilePath = path.resolve(path.dirname(this.filePath), rawMeta.source.value);
                result.push({
                  exportedName,
                  target: {
                    filePath: moduleFilePath,
                    name: specifier.local.name,
                    __TDeclRef__: "__TDeclRef__"
                  }
                });
              }
              else {
                const moduleName = rawMeta.source.value;
                result.push({
                  exportedName,
                  target: { moduleName, name: specifier.local.name, __TDeclRef__: "__TDeclRef__" }
                });
              }
            }
            else {
              result.push({
                exportedName,
                target: this._findMetaFromInside(specifier.local.name)
              });
            }
          }
          else {
            throw SdCliBbUtil.error("예상치 못한 방식의 코드가 발견되었습니다.", this.filePath, rawMeta);
          }
        }
      }
      else if (isExportDefaultDeclaration(rawMeta)) {
        result.push({
          exportedName: "default",
          target: this.getMetaFromRaw(rawMeta.declaration)
        });
      }
      else {
        if (rawMeta.source.value.includes(".")) {
          const moduleFilePath = path.resolve(path.dirname(this.filePath), rawMeta.source.value);
          result.push({
            exportedName: "*",
            target: {
              filePath: moduleFilePath,
              name: "*",
              __TDeclRef__: "__TDeclRef__"
            }
          });
        }
        else {
          throw SdCliBbUtil.error("예상치 못한 방식의 코드가 발견되었습니다.", this.filePath, rawMeta);
        }
      }
    }

    this._exportsCache = result;
    return result;
  }

  private readonly _findMetaFromOutsideCache = new Map<string, TSdCliBbMetadata>();

  public findMetaFromOutside(name: string): TSdCliBbMetadata {
    const cache = this._findMetaFromOutsideCache.get(name);
    if (cache !== undefined) return cache;

    for (const rawMeta of this.rawMetas) {
      if (isExportNamedDeclaration(rawMeta)) {
        if (rawMeta.declaration) {
          if (isVariableDeclaration(rawMeta.declaration)) {
            for (const decl of rawMeta.declaration.declarations) {
              if (isIdentifier(decl.id)) {
                if (decl.id.name === name) {
                  const result = new SdCliBbVariableMetadata(this, decl);
                  this._findMetaFromOutsideCache.set(name, result);
                  return result;
                }
              }
              else {
                throw SdCliBbUtil.error("예상치 못한 방식의 코드가 발견되었습니다.", this.filePath, rawMeta);
              }
            }
          }
          else if (isClassDeclaration(rawMeta.declaration)) {
            if (rawMeta.declaration.id.name === name) {
              const result = new SdCliBbClassMetadata(this, rawMeta.declaration);
              this._findMetaFromOutsideCache.set(name, result);
              return result;
            }
          }
          else if (isFunctionDeclaration(rawMeta.declaration)) {
            if (rawMeta.declaration.id) {
              if (rawMeta.declaration.id.name === name) {
                const result = new SdCliBbFunctionMetadata(this, rawMeta.declaration);
                this._findMetaFromOutsideCache.set(name, result);
                return result;
              }
            }
            else {
              throw SdCliBbUtil.error("예상치 못한 방식의 코드가 발견되었습니다.", this.filePath, rawMeta);
            }
          }
          else {
            throw SdCliBbUtil.error("예상치 못한 방식의 코드가 발견되었습니다.", this.filePath, rawMeta);
          }
        }
        else {
          for (const specifier of rawMeta.specifiers) {
            if (isExportSpecifier(specifier)) {
              const exportedName = isIdentifier(specifier.exported) ? specifier.exported.name : undefined;
              if (exportedName === undefined) {
                throw SdCliBbUtil.error("예상치 못한 방식의 코드가 발견되었습니다.", this.filePath, rawMeta);
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
      }
      else if (isExportDefaultDeclaration(rawMeta) && name === "default") {
        const result = this.getMetaFromRaw(rawMeta.declaration);
        if (Array.isArray(result)) {
          throw SdCliBbUtil.error("예상치 못한 방식의 코드가 발견되었습니다.", this.filePath, rawMeta);
        }
        this._findMetaFromOutsideCache.set(name, result);
        return result;
      }
    }

    throw SdCliBbUtil.error(`'${name}'에 대한 'export'를 찾을 수 없습니다.`, this.filePath);
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
              throw SdCliBbUtil.error("예상치 못한 방식의 코드가 발견되었습니다.", this.filePath, rawMeta);
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
              throw SdCliBbUtil.error("예상치 못한 방식의 코드가 발견되었습니다.", this.filePath, rawMeta);
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
                throw SdCliBbUtil.error("예상치 못한 방식의 코드가 발견되었습니다.", this.filePath, rawMeta);
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
            throw SdCliBbUtil.error("예상치 못한 방식의 코드가 발견되었습니다.", this.filePath, rawMeta);
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
          throw SdCliBbUtil.error("예상치 못한 방식의 코드가 발견되었습니다.", this.filePath, rawMeta);
        }
      }
    }

    throw SdCliBbUtil.error(`'${localName}'에 대한 내부선언을 찾을 수 없습니다.`, this.filePath);
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

    throw SdCliBbUtil.error("예상치 못한 방식의 코드가 발견되었습니다.", this.filePath, rawMeta);
  }
}
