import {
  isClassMetadata,
  isFunctionMetadata,
  isMetadataError,
  isMetadataGlobalReferenceExpression,
  isMetadataImportDefaultReference,
  isMetadataImportedSymbolReferenceExpression,
  isMetadataModuleReferenceExpression,
  isMetadataSymbolicCallExpression,
  MetadataArray,
  MetadataEntry,
  MetadataObject,
  MetadataSymbolicReferenceExpression,
  ModuleMetadata
} from "@angular/compiler-cli";
import {NeverEntryError} from "@simplysm/sd-core-common";
import * as path from "path";
import {SdModuleMetadata} from "./SdModuleMetadata";
import {isMetadataArrayExpression, isMetadataObjectExpression, TSdMetadata} from "./commons";
import {SdClassMetadata} from "./SdClassMetadata";
import {SdCallMetadata} from "./SdCallMetadata";
import {SdObjectMetadata} from "./SdObjectMetadata";
import {SdArrayMetadata} from "./SdArrayMetadata";
import {SdFunctionMetadata} from "./SdFunctionMetadata";
import {SdErrorMetadata} from "./SdErrorMetadata";

export class SdMetadataCollector {
  private readonly _moduleMetadataListObj: { [filePath: string]: ModuleMetadata[] } = {};

  private _modules: SdModuleMetadata[] | undefined;

  public get modules(): SdModuleMetadata[] {
    if (!this._modules) {
      this._modules = Object.keys(this._moduleMetadataListObj)
        .mapMany(key => (
          this._moduleMetadataListObj[key]
            .map(metadata => new SdModuleMetadata(this, metadata, key))
        ));
    }

    return this._modules;
  }

  private _moduleMapObj: { [key: string]: SdModuleMetadata[] | undefined } | undefined;

  public get moduleMapObj(): { [key: string]: SdModuleMetadata[] | undefined } {
    if (!this._moduleMapObj) {
      this._moduleMapObj = {};
      for (const key of Object.keys(this._moduleMetadataListObj)) {
        this._moduleMapObj[key] =
          this._moduleMetadataListObj[key].map(metadata => new SdModuleMetadata(this, metadata, key));
      }
    }

    return this._moduleMapObj;
  }

  public register(filePath: string, metadata: ModuleMetadata | ModuleMetadata[]): void {
    this._moduleMetadataListObj[path.resolve(filePath)] = metadata instanceof Array ? metadata : [metadata];
    this._moduleMapObj = undefined;
    this._modules = undefined;
  }

  public unregister(filePath: string): void {
    delete this._moduleMetadataListObj[path.resolve(filePath)];
    this._moduleMapObj = undefined;
    this._modules = undefined;
  }

  public findRealMetadata(module: SdModuleMetadata, metadata: MetadataEntry): {
    module: SdModuleMetadata;
    metadata: Exclude<MetadataEntry, MetadataSymbolicReferenceExpression>;
  } | undefined {
    if (isMetadataGlobalReferenceExpression(metadata)) {
      return this.findRealMetadata(module, module.metadata.metadata[metadata.name]);
    }
    else if (isMetadataModuleReferenceExpression(metadata)) {
      throw new NeverEntryError();
    }
    else if (isMetadataImportedSymbolReferenceExpression(metadata)) {
      let currModule: SdModuleMetadata | undefined;
      if (metadata.module.startsWith(".")) {
        const moduleFilePaths = [
          path.resolve(path.dirname(module.filePath), metadata.module) + ".ts",
          path.resolve(path.dirname(module.filePath), metadata.module) + ".d.ts"
        ];
        currModule = this.modules.single(item => moduleFilePaths.includes(item.filePath));

        if (!currModule) {
          // throw new Error(`파일을 찾을 수 없습니다: ${moduleFilePaths.toString()}`);
          return undefined;
        }

        /*const currModules = this.moduleMapObj[path.resolve(path.dirname(module.filePath), metadata.module) + ".ts"] ??
          this.moduleMapObj[path.resolve(path.dirname(module.filePath), metadata.module) + ".d.ts"];

        if (!currModules) {
          throw new Error(`파일을 찾을 수 없습니다: ${path.resolve(path.dirname(module.filePath), metadata.module)}`);
        }

        currModule = currModules.single(item => item.name === metadata.module);

        if (!currModule) {
          console.log(currModules);
          throw new Error(`모듈을 찾을 수 없습니다: (${metadata.module}, ${path.resolve(path.dirname(module.filePath), metadata.module)})`);
        }*/
      }
      else {
        currModule = this.modules.single(item => item.name === metadata.module && Object.keys(item.metadata.metadata).includes(metadata.name));

        if (!currModule) {
          // throw new Error(`모듈을 찾을 수 없습니다: ${metadata.module}`);
          return undefined;
        }
      }

      return this.findRealMetadata(currModule, currModule.metadata.metadata[metadata.name]);
    }
    else if (isMetadataImportDefaultReference(metadata)) {
      throw new NeverEntryError();
    }
    else {
      return {module, metadata};
    }
  }

  public getSdMetadata(module: SdModuleMetadata, metadata: MetadataEntry): TSdMetadata {
    const real = this.findRealMetadata(module, metadata);
    if (!real) return undefined;

    let value: TSdMetadata;
    if (isClassMetadata(real.metadata)) {
      value = new SdClassMetadata(this, real.module, real.metadata);
    }
    else if (isMetadataSymbolicCallExpression(real.metadata)) {
      value = new SdCallMetadata(this, real.module, real.metadata);
    }
    else if (isMetadataObjectExpression(real.metadata)) {
      value = new SdObjectMetadata(this, real.module, real.metadata);
    }
    else if (isMetadataArrayExpression(real.metadata)) {
      value = new SdArrayMetadata(this, real.module, real.metadata);
    }
    else if (isFunctionMetadata(real.metadata)) {
      value = new SdFunctionMetadata(this, real.module, real.metadata);
    }/*
    else if (isInterfaceMetadata(real.metadata)) {
      value = new SdInterfaceMetadata(this, real.module, real.metadata);
    }*/
    else if (typeof real.metadata === "string" || typeof real.metadata === "number" || typeof real.metadata === "boolean" || real.metadata === undefined) {
      value = real.metadata;
    }
    else if (isMetadataError(real.metadata)) {
      value = new SdErrorMetadata(this, real.module, real.metadata);
    }
    else {
      // IGNORE
    }

    return value;
  }

  public getSdMetadataObject(module: SdModuleMetadata, metadata: MetadataObject): { [key: string]: TSdMetadata } {
    const result: { [key: string]: TSdMetadata } = {};
    for (const key of Object.keys(metadata)) {
      Object.defineProperty(result, key, {
        enumerable: true,
        configurable: true,
        get: () => this.getSdMetadata(module, metadata[key])
      });
      // result[key] = this.getSdMetadata(module, metadata[key]);
    }
    return result;
  }

  public getSdMetadataArray(module: SdModuleMetadata, metadata: MetadataArray): TSdMetadata[] {
    const result: TSdMetadata[] = [];

    const pushItem = (sdMetadata: TSdMetadata | TSdMetadata[]): void => {
      if (sdMetadata instanceof Array || sdMetadata instanceof SdArrayMetadata) {
        for (const sdMetadataItem of Array.from(sdMetadata)) {
          pushItem(sdMetadataItem);
        }
      }
      else {
        result.push(sdMetadata);
      }
    };

    for (const item of metadata as MetadataEntry[]) {
      const sdMetadata = this.getSdMetadata(module, item);
      pushItem(sdMetadata);
    }

    return result;
  }
}

/*export class SdInterfaceMetadata extends SdMetadataBase {
  public constructor(public pkg: SdPackageMetadata,
                     public module: SdModuleMetadata,
                     public metadata: InterfaceMetadata) {
    super();
  }
}*/