import {
  ClassMetadata,
  FunctionMetadata,
  isClassMetadata,
  isFunctionMetadata,
  isMetadataError,
  isMetadataGlobalReferenceExpression,
  isMetadataImportedSymbolReferenceExpression,
  isMetadataSymbolicCallExpression,
  isMetadataSymbolicExpression,
  isMetadataSymbolicReferenceExpression,
  MetadataObject,
  MetadataSymbolicReferenceExpression,
  ModuleMetadata
} from "@angular/compiler-cli";
import {FsUtil} from "@simplysm/sd-core-node";
import {
  InterfaceMetadata,
  MetadataEntry,
  MetadataSymbolicBinaryExpression,
  MetadataSymbolicCallExpression,
  MetadataSymbolicIfExpression,
  MetadataSymbolicIndexExpression,
  MetadataSymbolicPrefixExpression,
  MetadataValue
} from "@angular/compiler-cli/src/metadata/schema";
import {NotImplementError} from "@simplysm/sd-core-common";
import * as path from "path";

export abstract class SdMetadataBase {
  public abstract readonly bundleMetadata: SdBundleMetadata;
  public abstract readonly moduleMetadata: SdModuleMetadata;

  public convertReferenceExpression(refMetadata: MetadataSymbolicReferenceExpression): { module: string | undefined; name: string } {
    if (isMetadataImportedSymbolReferenceExpression(refMetadata)) {
      return refMetadata;
    }
    else if (isMetadataGlobalReferenceExpression(refMetadata)) {
      return {
        ...refMetadata,
        module: this.moduleMetadata.name
      };
    }
    else {
      throw new NotImplementError();
    }
  }

  public findReferenceTargetMetadata(refMetadata: MetadataSymbolicReferenceExpression, currMetadata: SdMetadataBase): ISdMetadataReferenceTarget | ISdMetadataReferenceTarget[] {
    const convertedRefMetadata = this.convertReferenceExpression(refMetadata);
    if (!convertedRefMetadata.module) throw new NotImplementError();

    let targetModuleMetadata: SdModuleMetadata;
    if (convertedRefMetadata.module.startsWith(".")) {
      const tempTargetModuleMetadata = this.bundleMetadata.modules
        .single((module) =>
          path.resolve(module.filePath) === path.resolve(path.dirname(currMetadata.moduleMetadata.filePath), convertedRefMetadata.module! + ".metadata.json")
        );
      if (!tempTargetModuleMetadata) throw new NotImplementError();
      targetModuleMetadata = tempTargetModuleMetadata;
    }
    else {
      const tempTargetModuleMetadata = this.bundleMetadata.modules
        .single((module) => module.name === convertedRefMetadata.module);
      if (!tempTargetModuleMetadata) throw new NotImplementError();
      targetModuleMetadata = tempTargetModuleMetadata;
    }

    const targetMetadata = targetModuleMetadata.metadata.metadata[convertedRefMetadata.name];

    if (targetMetadata === undefined) {
      throw new NotImplementError();
    }
    else if (isMetadataSymbolicReferenceExpression(targetMetadata)) {
      return this.findReferenceTargetMetadata(targetMetadata, currMetadata);
    }
    else if (targetMetadata instanceof Array) {
      return targetMetadata.mapMany((item) => {
        if (isMetadataSymbolicReferenceExpression(item)) {
          const result = this.findReferenceTargetMetadata(item, currMetadata);
          return result instanceof Array ? result : [result];
        }
        else {
          const arr = item instanceof Array ? item : [item];
          return arr.map((item1) => ({
            moduleMetadata: targetModuleMetadata,
            target: item1
          }));
        }
      });
    }
    else if (isMetadataError(targetMetadata)) {
      throw new NotImplementError();
    }
    else {
      return {
        moduleMetadata: targetModuleMetadata,
        target: targetMetadata
      };
    }
  }
}

export class SdBundleMetadata {
  public moduleMetadataListObj: { [filePath: string]: ModuleMetadata[] } = {};
  public isIgnoreFileObj: { [filePath: string]: boolean } = {};
  public isPackageFileObj: { [filePath: string]: boolean } = {};

  public get modules(): SdModuleMetadata[] {
    return Object.keys(this.moduleMetadataListObj)
      .mapMany((key) =>
        this.moduleMetadataListObj[key]
          .map((metadata) => new SdModuleMetadata(this, metadata, key))
      );
  }

  public get ngModuleDefs(): ISdMetadataBundleNgModuleDef[] {
    const result: ISdMetadataBundleNgModuleDef[] = [];

    for (const module of this.modules) {
      for (const moduleClass of module.classes) {
        if (!moduleClass.name) throw new NotImplementError();
        let moduleDef: ISdMetadataBundleNgModuleDef | undefined;

        if (!moduleClass.decorators) continue;
        for (const decorator of moduleClass.decorators) {

          //---------------------
          // LIBRARY NgModule
          //---------------------

          if (
            !this.isIgnoreFileObj[module.filePath] &&
            decorator.expression.module === "@angular/core" &&
            decorator.expression.name === "NgModule"
          ) {
            if (!decorator.arguments || !decorator.arguments[0]) throw new NotImplementError();

            moduleDef = {
              filePath: module.filePath,
              moduleName: module.name,
              className: moduleClass.name,
              isNeedGenerateFile: false,
              isPackageFile: this.isPackageFileObj[module.filePath],
              exports: []
            };

            const decoratorArg = decorator.arguments[0];
            if (!(decoratorArg instanceof SdObjectMetadata)) throw new NotImplementError();

            // EXPORTS
            const exportClasses = decoratorArg.getChildList("exports");
            if (exportClasses) {
              for (const exportClass of exportClasses) {
                if (!(exportClass instanceof SdClassMetadata)) throw new NotImplementError();
                if (!exportClass.decorators) throw new NotImplementError();

                for (const exportClassDecorator of exportClass.decorators) {
                  if (
                    exportClassDecorator.expression.module === "@angular/core" &&
                    [
                      "Component",
                      "Directive",
                      "Pipe",
                      "Injectable"
                    ].includes(exportClassDecorator.expression.name)
                  ) {
                    moduleDef.exports.push(exportClass);
                  }
                }
              }
            }

            // PROVIDERS
            const providers = decoratorArg.getChildList("providers");
            if (providers) {
              for (const provider of providers) {
                if (provider instanceof SdObjectMetadata) {
                  const providerProvide = provider.getChild("provide");
                  if (providerProvide instanceof SdClassMetadata) {
                    moduleDef.exports.push(providerProvide);
                  }
                  else if (providerProvide instanceof SdCallMetadata) {
                    // IGNORE
                    // console.log(module.name, moduleClass.name, providerProvide.expression.module + "." + providerProvide.expression.name);
                  }
                  else {
                    throw new NotImplementError();
                  }
                }
                else if (provider instanceof SdClassMetadata) {
                  moduleDef.exports.push(provider);
                }
                else {
                  throw new NotImplementError();
                }
              }
            }

            // STATIC PROVIDERS
            if (moduleClass.staticFunctions) {
              for (const staticFunction of moduleClass.staticFunctions) {
                if (!staticFunction.value) continue;

                const staticProviders = staticFunction.value.getChildList("providers");
                if (!staticProviders) continue;

                for (const staticProvider of staticProviders) {
                  if (staticProvider instanceof SdObjectMetadata) {
                    const staticProviderProvide = staticProvider.getChild("provide");
                    if (staticProviderProvide instanceof SdClassMetadata) {
                      moduleDef.exports.push(staticProviderProvide);
                    }
                    else if (staticProviderProvide instanceof SdCallMetadata) {
                      // IGNORE
                      // console.log(module.name, moduleClass.name, staticProviderProvide.expression.module + "." + staticProviderProvide.expression.name);
                    }
                    else {
                      throw new NotImplementError();
                    }
                  }
                  else if (staticProvider instanceof SdClassMetadata) {
                    moduleDef.exports.push(staticProvider);
                  }
                  else if (staticProvider instanceof SdCallMetadata) {
                    // IGNORE
                    // console.log(module.name, moduleClass.name, staticProvider.expression.module + "." + staticProvider.expression.name);
                  }
                  else {
                    throw new NotImplementError();
                  }
                }
              }
            }
          }


          //---------------------
          // CUSTOM (NON PROVIDER)
          //---------------------

          if (
            !this.isIgnoreFileObj[module.filePath] &&
            this.isPackageFileObj[module.filePath] &&
            decorator.expression.module === "@angular/core" &&
            [
              "Component",
              "Directive",
              "Pipe"
              // "Injectable"
            ].includes(decorator.expression.name)
          ) {
            moduleDef = {
              filePath: undefined,
              moduleName: undefined,
              className: moduleClass.name + "Module",
              isNeedGenerateFile: true,
              isPackageFile: true,
              exports: []
            };

            moduleDef.exports.push(moduleClass);
          }


          if (moduleDef && moduleDef.exports.length > 0) {
            result.push(moduleDef);
          }
        }
      }
    }

    return result;
  }

  public async registerAsync(metadataFilePath: string, isIgnoreFile: boolean, isPackageFile: boolean): Promise<void> {
    const metadata = await FsUtil.readJsonAsync(metadataFilePath);
    this.moduleMetadataListObj[metadataFilePath] = metadata instanceof Array ? metadata : [metadata];
    this.isIgnoreFileObj[metadataFilePath] = isIgnoreFile;
    this.isPackageFileObj[metadataFilePath] = isPackageFile;
  }

  public unregister(metadataFilePath: string): void {
    delete this.moduleMetadataListObj[metadataFilePath];
  }

  /*public findClassMetadata(moduleName: string, className: string): SdClassMetadata | undefined {
    return Array.from(
      this.modules
        .single((item) => item.name === moduleName)
        ?.classes || []
    )?.single((item) => item.name === className);
  }*/
}

export class SdModuleMetadata {
  public get name(): string | undefined {
    return this.metadata.importAs;
  }

  public get classes(): ReadonlyArray<SdClassMetadata> {
    const classes: SdClassMetadata[] = [];
    for (const key of Object.keys(this.metadata.metadata)) {
      const entry = this.metadata.metadata[key];
      if (isClassMetadata(entry)) {
        classes.push(new SdClassMetadata(this.bundleMetadata, this, entry));
      }
    }

    return classes;
  }

  public constructor(public readonly bundleMetadata: SdBundleMetadata,
                     public readonly metadata: ModuleMetadata,
                     public readonly filePath: string) {
  }
}

export class SdClassMetadata extends SdMetadataBase {
  public get decorators(): ReadonlyArray<SdCallMetadata> | undefined {
    if (this.metadata.decorators) {
      const decorators: SdCallMetadata[] = [];
      for (const decorator of this.metadata.decorators) {
        if (isMetadataSymbolicCallExpression(decorator)) {
          decorators.push(new SdCallMetadata(this.bundleMetadata, this.moduleMetadata, decorator));
        }
        else {
          throw new NotImplementError();
        }
      }

      return decorators;
    }
    else {
      return undefined;
    }
  }

  public get staticFunctions(): ReadonlyArray<SdFunctionMetadata> | undefined {
    if (this.metadata.statics) {
      const staticFunctions: SdFunctionMetadata[] = [];
      for (const staticKey of Object.keys(this.metadata.statics)) {
        const staticMetadata = this.metadata.statics[staticKey];
        if (isFunctionMetadata(staticMetadata)) {
          staticFunctions.push(new SdFunctionMetadata(this.bundleMetadata, this.moduleMetadata, staticMetadata));
        }
        else {
          throw new NotImplementError();
        }
      }
      return staticFunctions;
    }
    else {
      return undefined;
    }
  }

  public get name(): string | undefined {
    return Object.keys(this.moduleMetadata.metadata.metadata)
      .single((key) => this.moduleMetadata.metadata.metadata[key] === this.metadata);
  }

  public constructor(public readonly bundleMetadata: SdBundleMetadata,
                     public readonly moduleMetadata: SdModuleMetadata,
                     public readonly metadata: ClassMetadata) {
    super();
  }
}

export class SdCallMetadata extends SdMetadataBase {
  public get expression(): { module: string | undefined; name: string } {
    if (isMetadataSymbolicReferenceExpression(this.metadata.expression)) {
      const expression = this.convertReferenceExpression(this.metadata.expression);
      return {
        module: expression.module,
        name: expression.name
      };
    }
    else {
      throw new NotImplementError();
    }
  }

  public get arguments(): ReadonlyArray<TSdCallMetadataArgument | TSdCallMetadataArgument[]> | undefined {
    if (this.metadata.arguments) {
      const args: (TSdCallMetadataArgument | TSdCallMetadataArgument[])[] = [];

      const configArgs = (thisArgs: (TSdCallMetadataArgument | TSdCallMetadataArgument[])[], thisArg: MetadataEntry, moduleMetadata?: SdModuleMetadata) => {
        if (isMetadataObjectExpression(thisArg)) {
          thisArgs.push(
            new SdObjectMetadata(
              this.bundleMetadata,
              moduleMetadata ?? this.moduleMetadata,
              thisArg
            )
          );
        }
        else if (typeof thisArg === "string" || typeof thisArg === "number" || typeof thisArg === "boolean") {
          thisArgs.push(thisArg);
        }
        else {
          throw new NotImplementError();
        }
      };

      for (const arg of this.metadata.arguments) {
        if (isMetadataSymbolicReferenceExpression(arg)) {
          const realArgTarget = this.findReferenceTargetMetadata(arg, this);
          if (realArgTarget instanceof Array) {
            const subArgs: TSdCallMetadataArgument[] = [];
            args.push(subArgs);

            for (const realArgTargetItem of realArgTarget) {
              configArgs(subArgs, realArgTargetItem.target, realArgTargetItem.moduleMetadata);
            }
          }
          else {
            configArgs(args, realArgTarget.target, realArgTarget.moduleMetadata);
          }
        }
        else {
          if (arg instanceof Array) {
            const subArgs: TSdCallMetadataArgument[] = [];
            args.push(subArgs);

            for (const argItem of arg) {
              configArgs(subArgs, argItem);
            }
          }
          else {
            configArgs(args, arg);
          }
        }
      }

      return args;
    }
    else {
      return undefined;
    }
  }

  public constructor(public readonly bundleMetadata: SdBundleMetadata,
                     public readonly moduleMetadata: SdModuleMetadata,
                     public readonly metadata: MetadataSymbolicCallExpression) {
    super();
  }
}

export class SdFunctionMetadata extends SdMetadataBase {
  public get value(): SdObjectMetadata | undefined {
    if (this.metadata.value) {
      if (isMetadataObjectExpression(this.metadata.value)) {
        return new SdObjectMetadata(this.bundleMetadata, this.moduleMetadata, this.metadata.value);
      }
      else {
        throw new NotImplementError();
      }
    }
    else {
      return undefined;
    }
  }

  public constructor(public readonly bundleMetadata: SdBundleMetadata,
                     public readonly moduleMetadata: SdModuleMetadata,
                     public readonly metadata: FunctionMetadata) {
    super();
  }
}

export class SdObjectMetadata extends SdMetadataBase {
  public constructor(public readonly bundleMetadata: SdBundleMetadata,
                     public readonly moduleMetadata: SdModuleMetadata,
                     public readonly metadata: MetadataObject) {
    super();
  }

  public getChildList(childName: string): (SdClassMetadata | SdObjectMetadata | SdCallMetadata)[] | undefined {
    const child = this.metadata[childName];
    if (!child) return undefined;

    const result: (SdClassMetadata | SdObjectMetadata | SdCallMetadata)[] = [];

    if (isMetadataSymbolicReferenceExpression(child) || (!isMetadataSymbolicExpression(child) && !isMetadataError(child))) {
      if (isMetadataSymbolicReferenceExpression(child)) {
        const realChild = this.findReferenceTargetMetadata(child, this);
        if (realChild instanceof Array) {
          for (const childItem of realChild) {
            if (isMetadataObjectExpression(childItem.target)) {
              result.push(new SdObjectMetadata(this.bundleMetadata, childItem.moduleMetadata, childItem.target));
            }
            else if (isMetadataSymbolicCallExpression(childItem.target)) {
              result.push(new SdCallMetadata(this.bundleMetadata, childItem.moduleMetadata, childItem.target));
            }
            else if (isClassMetadata(childItem.target)) {
              result.push(new SdClassMetadata(this.bundleMetadata, childItem.moduleMetadata, childItem.target));
            }
            else {
              throw new NotImplementError();
            }
          }
        }
        else {
          throw new NotImplementError();
        }
      }
      else {
        if (child instanceof Array) {
          for (const childItem of child) {
            if (isMetadataSymbolicReferenceExpression(childItem)) {
              let childTarget = this.findReferenceTargetMetadata(childItem, this);
              childTarget = childTarget instanceof Array ? childTarget : [childTarget];
              for (const childTargetItem of childTarget) {
                if (isClassMetadata(childTargetItem.target)) {
                  result.push(new SdClassMetadata(this.bundleMetadata, childTargetItem.moduleMetadata, childTargetItem.target));
                }
                else if (isMetadataObjectExpression(childTargetItem.target)) {
                  result.push(new SdObjectMetadata(this.bundleMetadata, childTargetItem.moduleMetadata, childTargetItem.target));
                }
                else {
                  throw new NotImplementError();
                }
              }
            }
            else if (isMetadataObjectExpression(childItem)) {
              result.push(new SdObjectMetadata(this.bundleMetadata, this.moduleMetadata, childItem));
            }
            else if (isMetadataSymbolicCallExpression(childItem)) {
              result.push(new SdCallMetadata(this.bundleMetadata, this.moduleMetadata, childItem));
            }
            else if (isClassMetadata(childItem)) {
              result.push(new SdClassMetadata(this.bundleMetadata, this.moduleMetadata, childItem));
            }
            else {
              throw new NotImplementError();
            }
          }
        }
        else {
          throw new NotImplementError();
        }
      }
    }
    else {
      throw new NotImplementError();
    }

    return result;
  }

  public getChild(childName: string): SdClassMetadata | SdObjectMetadata | SdCallMetadata | undefined {
    const child = this.metadata[childName];
    if (!child) return undefined;

    if (isMetadataSymbolicReferenceExpression(child) || (!isMetadataSymbolicExpression(child) && !isMetadataError(child))) {
      if (isMetadataSymbolicReferenceExpression(child)) {
        const realChild = this.findReferenceTargetMetadata(child, this);

        if (!(realChild instanceof Array)) {
          if (isMetadataObjectExpression(realChild.target)) {
            return new SdObjectMetadata(this.bundleMetadata, realChild.moduleMetadata, realChild.target);
          }
          else if (isMetadataSymbolicCallExpression(realChild.target)) {
            return new SdCallMetadata(this.bundleMetadata, realChild.moduleMetadata, realChild.target);
          }
          else if (isClassMetadata(realChild.target)) {
            return new SdClassMetadata(this.bundleMetadata, realChild.moduleMetadata, realChild.target);
          }
          else {
            throw new NotImplementError();
          }
        }
        else {
          throw new NotImplementError();
        }
      }
      else {
        if (!(child instanceof Array)) {
          if (isMetadataSymbolicReferenceExpression(child)) {
            const childTarget = this.findReferenceTargetMetadata(child, this);
            if (!(childTarget instanceof Array)) {
              if (isClassMetadata(childTarget.target)) {
                return new SdClassMetadata(this.bundleMetadata, childTarget.moduleMetadata, childTarget.target);
              }
              else if (isMetadataObjectExpression(childTarget.target)) {
                return new SdObjectMetadata(this.bundleMetadata, childTarget.moduleMetadata, childTarget.target);
              }
              else {
                throw new NotImplementError();
              }
            }
            else {
              throw new NotImplementError();
            }
          }
          else if (isMetadataObjectExpression(child)) {
            return new SdObjectMetadata(this.bundleMetadata, this.moduleMetadata, child);
          }
          else if (isMetadataSymbolicCallExpression(child)) {
            return new SdCallMetadata(this.bundleMetadata, this.moduleMetadata, child);
          }
          else if (isClassMetadata(child)) {
            return new SdClassMetadata(this.bundleMetadata, this.moduleMetadata, child);
          }
          else {
            throw new NotImplementError();
          }
        }
        else {
          throw new NotImplementError();
        }
      }
    }
    else {
      throw new NotImplementError();
    }
  }

  public getChildString(childName: string): string | undefined {
    const child = this.metadata[childName];
    if (!child) return undefined;
    if (typeof child !== "string") throw new NotImplementError();

    return child;
  }
}


export interface ISdMetadataBundleNgModuleDef {
  filePath: string | undefined;
  moduleName: string | undefined;
  className: string;
  isNeedGenerateFile: boolean;
  isPackageFile: boolean;
  exports: SdClassMetadata[];
}

export interface ISdMetadataReferenceTarget {
  moduleMetadata: SdModuleMetadata;
  target: string
    | number
    | boolean
    | undefined
    | null
    | MetadataObject
    | MetadataSymbolicBinaryExpression
    | MetadataSymbolicIndexExpression
    | MetadataSymbolicCallExpression
    | MetadataSymbolicPrefixExpression
    | MetadataSymbolicIfExpression
    | ClassMetadata
    | InterfaceMetadata
    | FunctionMetadata
    | MetadataValue;
}

export type TSdCallMetadataArgument = SdObjectMetadata | string | number | boolean;

export function isMetadataObjectExpression(item: MetadataEntry): item is MetadataObject {
  return item !== undefined &&
    !item!["__symbolic"] &&
    !(item instanceof Array) &&
    typeof item === "object";
}