import {
  Declaration,
  Expression,
  File,
  isArrayExpression,
  isAssignmentExpression,
  isCallExpression,
  isClassDeclaration,
  isConditionalExpression,
  isExportDeclaration,
  isExportDefaultDeclaration,
  isExportNamedDeclaration,
  isExportSpecifier,
  isExpressionStatement,
  isFunctionDeclaration,
  isIdentifier,
  isImportDeclaration,
  isImportDefaultSpecifier,
  isImportNamespaceSpecifier,
  isImportSpecifier,
  isMemberExpression,
  isObjectExpression,
  isSpreadElement,
  isStringLiteral,
  isVariableDeclaration,
  PatternLike,
  SpreadElement,
  Statement,
  traverseFast
} from "@babel/types";
import babelParser, { ParseResult } from "@babel/parser";
import { FsUtil } from "@simplysm/sd-core-node";
import path from "path";
import { TSdCliBbMetadata } from "./SdCliBbRootMetadata";
import {
  SdCliBbArrayMetadata,
  SdCliBbClassMetadata,
  SdCliBbConditionMetadata,
  SdCliBbFunctionMetadata,
  SdCliBbObjectMetadata,
  SdCliBbVariableMetadata
} from "./TSdCliBbTypeMetadata";
import { SdCliBbUtil } from "./SdCliBbUtil";
import { NeverEntryError } from "@simplysm/sd-core-common";

export class SdCliBbFileMetadata {
  public readonly ast: ParseResult<File>;
  public readonly rawMetas: Statement[];

  public constructor(public readonly filePath: string) {
    let realFilePath: string | undefined;
    for (const ext of ["", ".mjs", ".cjs", ".js"/*, "/index.mjs", "/index.cjs", "/index.js"*/]) {
      if (FsUtil.exists(filePath + ext) && !FsUtil.stat(filePath + ext).isDirectory()) {
        realFilePath = filePath + ext;
        break;
      }
    }
    if (realFilePath === undefined) {
      throw SdCliBbUtil.error("파일을 찾을 수 없습니다.", filePath);
    }

    const fileContent = FsUtil.readFile(realFilePath);
    try {
      this.ast = babelParser.parse(fileContent, { sourceType: "module" });
    }
    catch (err) {
      throw SdCliBbUtil.error(err.message, this.filePath, err.loc);
    }
    this.rawMetas = this.ast.program.body;
  }

  private _exportsCache?: { exportedName: string; target: TSdCliBbMetadata }[];

  public get exports(): { exportedName: string; target: TSdCliBbMetadata }[] {
    if (this._exportsCache) return this._exportsCache;

    const result: { exportedName: string; target: TSdCliBbMetadata }[] = [];
    for (const rawMeta of this.rawMetas) {
      if (!isExportDeclaration(rawMeta)) continue;

      if (isExportNamedDeclaration(rawMeta)) {
        if (rawMeta.declaration) {
          if (isVariableDeclaration(rawMeta.declaration)) {
            for (const decl of rawMeta.declaration.declarations) {
              if (isIdentifier(decl.id)) {
                result.push({
                  exportedName: decl.id.name,
                  target: new SdCliBbVariableMetadata(this, decl)
                });
              }
              else {
                throw SdCliBbUtil.error("예상치 못한 방식의 코드가 발견되었습니다.", this.filePath, rawMeta);
              }
            }
          }
          else if (isClassDeclaration(rawMeta.declaration)) {
            result.push({
              exportedName: rawMeta.declaration.id.name,
              target: new SdCliBbClassMetadata(this, rawMeta.declaration)
            });
          }
          else if (isFunctionDeclaration(rawMeta.declaration)) {
            if (rawMeta.declaration.id) {
              result.push({
                exportedName: rawMeta.declaration.id.name,
                target: new SdCliBbFunctionMetadata(this, rawMeta.declaration)
              });
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

              if (rawMeta.source) {
                if (rawMeta.source.value.startsWith(".")) {
                  const moduleFilePath = path.resolve(path.dirname(this.filePath), rawMeta.source.value);
                  result.push({
                    exportedName,
                    target: {
                      filePath: moduleFilePath,
                      name: specifier.local.name,
                      __TSdCliMetaRef__: "__TSdCliMetaRef__"
                    }
                  });
                }
                else {
                  const moduleName = rawMeta.source.value;
                  result.push({
                    exportedName,
                    target: { moduleName, name: specifier.local.name, __TSdCliMetaRef__: "__TSdCliMetaRef__" }
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
      }
      else if (isExportDefaultDeclaration(rawMeta)) {
        result.push({
          exportedName: "default",
          target: this.getMetaFromRaw(rawMeta.declaration)
        });
      }
      else {
        if (rawMeta.source.value.startsWith(".")) {
          const moduleFilePath = path.resolve(path.dirname(this.filePath), rawMeta.source.value);
          result.push({
            exportedName: "*",
            target: {
              filePath: moduleFilePath,
              name: "*",
              __TSdCliMetaRef__: "__TSdCliMetaRef__"
            }
          });
        }
        else {
          const moduleName = rawMeta.source.value;
          result.push({
            exportedName: "*",
            target: { moduleName, name: "*", __TSdCliMetaRef__: "__TSdCliMetaRef__" }
          });
        }
      }
    }

    this._exportsCache = result;
    return result;
  }

  private readonly _findMetaFromOutsideCache = new Map<string, TSdCliBbMetadata>();

  public findMetaFromOutside(name: string): TSdCliBbMetadata | undefined {
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
                  if (rawMeta.source.value.startsWith(".")) {
                    const moduleFilePath = path.resolve(path.dirname(this.filePath), rawMeta.source.value);
                    const result = {
                      filePath: moduleFilePath,
                      name: specifier.local.name,
                      __TSdCliMetaRef__: "__TSdCliMetaRef__" as const
                    };
                    this._findMetaFromOutsideCache.set(name, result);
                    return result;
                  }
                  else {
                    const moduleName = rawMeta.source.value;
                    const result = {
                      moduleName,
                      name: specifier.local.name,
                      __TSdCliMetaRef__: "__TSdCliMetaRef__" as const
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

    // throw SdCliBbUtil.error(`'${name}'에 대한 선언을 찾을 수 없습니다.`, this.filePath);
    return undefined;
  }

  private readonly _findMetaFromInsideCache = new Map<string, TSdCliBbMetadata>();

  private _findMetaFromInside(localName: string, excludeExport?: boolean): TSdCliBbMetadata {
    const cache = this._findMetaFromInsideCache.get(localName);
    if (cache !== undefined) return cache;

    for (const rawMeta of this.rawMetas) {
      if (isClassDeclaration(rawMeta) && rawMeta.id.name === localName) {
        return new SdCliBbClassMetadata(this, rawMeta);
      }
      else if (!excludeExport && isExportNamedDeclaration(rawMeta)) {
        for (const specifier of rawMeta.specifiers) {
          if (isExportSpecifier(specifier)) {
            const exportedName = isIdentifier(specifier.exported) ? specifier.exported.name : undefined;
            if (exportedName === undefined) {
              throw SdCliBbUtil.error("예상치 못한 방식의 코드가 발견되었습니다.", this.filePath, rawMeta);
            }
            else if (exportedName === localName) {
              if (rawMeta.source) {
                if (rawMeta.source.value.startsWith(".")) {
                  const moduleFilePath = path.resolve(path.dirname(this.filePath), rawMeta.source.value);
                  const result = {
                    filePath: moduleFilePath,
                    name: specifier.local.name,
                    __TSdCliMetaRef__: "__TSdCliMetaRef__" as const
                  };
                  this._findMetaFromInsideCache.set(localName, result);
                  return result;
                }
                else {
                  const moduleName = rawMeta.source.value;
                  const result = {
                    moduleName,
                    name: specifier.local.name,
                    __TSdCliMetaRef__: "__TSdCliMetaRef__" as const
                  };
                  this._findMetaFromInsideCache.set(localName, result);
                  return result;
                }
              }
              else {
                const localImportName = isIdentifier(specifier.local) ? specifier.local.name : undefined;

                if (localImportName === undefined) {
                  throw SdCliBbUtil.error("예상치 못한 방식의 코드가 발견되었습니다.", this.filePath, rawMeta);
                }
                else if (exportedName !== localImportName) {
                  const result = this._findMetaFromInside(localImportName);
                  this._findMetaFromInsideCache.set(localImportName, result);
                  return result;
                }
                else {
                  const result = this._findMetaFromInside(localImportName, true);
                  this._findMetaFromInsideCache.set(localImportName, result);
                  return result;
                }
              }
            }
          }
        }
      }
        // else if (!excludeExport && isExportDefaultDeclaration(rawMeta) && localName === "default") {
        //   const result = this.getMetaFromRaw(rawMeta.declaration);
        //   if (Array.isArray(result)) {
        //     throw new NeverEntryError();
        //   }
        //   this._findMetaFromInsideCache.set(localName, result);
        //   return result;
      // }
      else if (isImportDeclaration(rawMeta)) {
        for (const specifier of rawMeta.specifiers) {
          if (isImportSpecifier(specifier)) {
            const impLocalName = isIdentifier(specifier.local) ? specifier.local.name : undefined;
            if (impLocalName === undefined) {
              throw SdCliBbUtil.error("예상치 못한 방식의 코드가 발견되었습니다.", this.filePath, rawMeta);
            }
            else if (impLocalName === localName) {
              if (isIdentifier(specifier.imported)) {
                if (rawMeta.source.value.startsWith(".")) {
                  const moduleFilePath = path.resolve(path.dirname(this.filePath), rawMeta.source.value);
                  const result = {
                    filePath: moduleFilePath,
                    name: specifier.imported.name,
                    __TSdCliMetaRef__: "__TSdCliMetaRef__" as const
                  };
                  this._findMetaFromInsideCache.set(localName, result);
                  return result;
                }
                else {
                  const moduleName = rawMeta.source.value;
                  const result = {
                    moduleName,
                    name: specifier.imported.name,
                    __TSdCliMetaRef__: "__TSdCliMetaRef__" as const
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
          else if (isImportDefaultSpecifier(specifier)) {
            if (specifier.local.name === localName) {
              if (rawMeta.source.value.startsWith(".")) {
                const moduleFilePath = path.resolve(path.dirname(this.filePath), rawMeta.source.value);
                const result = {
                  filePath: moduleFilePath,
                  name: "default",
                  __TSdCliMetaRef__: "__TSdCliMetaRef__" as const
                };
                this._findMetaFromInsideCache.set(localName, result);
                return result;
              }
              else {
                const moduleName = rawMeta.source.value;
                const result = {
                  moduleName,
                  name: "default",
                  __TSdCliMetaRef__: "__TSdCliMetaRef__" as const
                };
                this._findMetaFromInsideCache.set(localName, result);
                return result;
              }
            }
          }
          else if (isImportNamespaceSpecifier(specifier)) {
            if (specifier.local.name === localName) {
              if (rawMeta.source.value.startsWith(".")) {
                const moduleFilePath = path.resolve(path.dirname(this.filePath), rawMeta.source.value);
                const result = {
                  filePath: moduleFilePath,
                  name: "*",
                  __TSdCliMetaRef__: "__TSdCliMetaRef__" as const
                };
                this._findMetaFromInsideCache.set(localName, result);
                return result;
              }
              else {
                const moduleName = rawMeta.source.value;
                const result = {
                  moduleName,
                  name: "*",
                  __TSdCliMetaRef__: "__TSdCliMetaRef__" as const
                };
                this._findMetaFromInsideCache.set(localName, result);
                return result;
                // throw SdCliBbUtil.error("예상치 못한 방식의 코드가 발견되었습니다.", this.filePath, rawMeta);
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
    else if (isFunctionDeclaration(rawMeta)) {
      return new SdCliBbFunctionMetadata(this, rawMeta);
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
    else if (isConditionalExpression(rawMeta)) {
      return new SdCliBbConditionMetadata(this, rawMeta);
    }

    throw SdCliBbUtil.error("예상치 못한 방식의 코드가 발견되었습니다.", this.filePath, rawMeta);
  }

  private readonly _getNgDecoArgCache = new Map<string, SdCliBbObjectMetadata | undefined>();

  public getNgDecoArg(className: string): SdCliBbObjectMetadata | undefined {
    if (this._getNgDecoArgCache.has(className)) {
      return this._getNgDecoArgCache.get(className)!;
    }

    for (const meta of this.rawMetas) {
      // 'compilationMode: partial' 일때
      if (
        isExpressionStatement(meta) &&
        isCallExpression(meta.expression) &&
        (
          (
            isMemberExpression(meta.expression.callee) &&
            isIdentifier(meta.expression.callee.property) &&
            meta.expression.callee.property.name === "ɵɵngDeclareClassMetadata"
          ) ||
          (
            isIdentifier(meta.expression.callee) &&
            meta.expression.callee.name === "ngDeclareClassMetadata"
          )
        ) &&
        isObjectExpression(meta.expression.arguments[0])
      ) {
        const objMeta = new SdCliBbObjectMetadata(this, meta.expression.arguments[0]);
        const typePropVal = objMeta.getPropValue("type");
        if (
          typePropVal instanceof SdCliBbClassMetadata &&
          typePropVal.name === className
        ) {
          const decos = objMeta.getPropValue("decorators");
          if (
            decos instanceof SdCliBbArrayMetadata &&
            decos.value[0] instanceof SdCliBbObjectMetadata
          ) {
            const args = decos.value[0].getPropValue("args");
            if (
              args instanceof SdCliBbArrayMetadata &&
              args.value[0] instanceof SdCliBbObjectMetadata
            ) {
              this._getNgDecoArgCache.set(className, args.value[0]);
              return args.value[0];
            }
          }
          else {
            throw new NeverEntryError();
          }
        }
      }
    }

    // 'compilationMode: full' 일때
    let result: SdCliBbObjectMetadata | undefined;
    traverseFast(this.ast, (node) => {
      if (
        isCallExpression(node) &&
        (
          (
            isMemberExpression(node.callee) &&
            isIdentifier(node.callee.property) &&
            node.callee.property.name === "ɵsetClassMetadata"
          ) ||
          (
            isIdentifier(node.callee) &&
            node.callee.name === "setClassMetadata"
          )
        ) &&
        isIdentifier(node.arguments[0]) &&
        node.arguments[0].name === className &&
        isArrayExpression(node.arguments[1])
      ) {
        const decos = new SdCliBbArrayMetadata(this, node.arguments[1]);
        if (decos.value[0] instanceof SdCliBbObjectMetadata) {
          const args = decos.value[0].getPropValue("args");
          if (
            args instanceof SdCliBbArrayMetadata &&
            args.value[0] instanceof SdCliBbObjectMetadata
          ) {
            result = args.value[0];
          }
        }
        else {
          throw new NeverEntryError();
        }
      }
    });

    // if (result === undefined) {
    //   throw new NeverEntryError(this.filePath + "," + className);
    // }

    this._getNgDecoArgCache.set(className, result);
    return result;
  }

  public getNgDecoPropValue(className: string, decoName: string, propName: string): TSdCliBbMetadata | undefined {
    for (const meta of this.rawMetas) {
      if (
        isExpressionStatement(meta) &&
        isAssignmentExpression(meta.expression) &&
        isMemberExpression(meta.expression.left) &&
        isIdentifier(meta.expression.left.object) &&
        meta.expression.left.object.name === className &&
        isIdentifier(meta.expression.left.property)
      ) {
        if (meta.expression.left.property.name === decoName) {
          if (
            isCallExpression(meta.expression.right) &&
            meta.expression.right.arguments.length > 0 &&
            isObjectExpression(meta.expression.right.arguments[0])
          ) {
            const dirObjMeta = new SdCliBbObjectMetadata(this, meta.expression.right.arguments[0]);
            return dirObjMeta.getPropValue(propName);
          }
          else {
            throw new NeverEntryError();
          }
        }
      }
    }

    throw new NeverEntryError();
  }
}
