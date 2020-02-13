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
import {FsUtil} from "@simplysm/sd-core-node";
import {NotImplementError} from "@simplysm/sd-core-common";
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

  public get modules(): SdModuleMetadata[] {
    return Object.keys(this._moduleMetadataListObj)
      .mapMany((key) =>
        this._moduleMetadataListObj[key]
          .map((metadata) => new SdModuleMetadata(this, metadata, key))
      );
  }

  public constructor(public distPath: string) {
  }

  public async registerAsync(metadataFilePath: string): Promise<void> {
    const metadata = await FsUtil.readJsonAsync(metadataFilePath);
    this._moduleMetadataListObj[path.resolve(metadataFilePath)] = metadata instanceof Array ? metadata : [metadata];
  }

  public unregister(metadataFilePath: string): void {
    delete this._moduleMetadataListObj[path.resolve(metadataFilePath)];
  }

  public findRealMetadata(module: SdModuleMetadata, metadata: MetadataEntry): {
    module: SdModuleMetadata;
    metadata: Exclude<MetadataEntry, MetadataSymbolicReferenceExpression>;
  } {
    if (isMetadataGlobalReferenceExpression(metadata)) {
      return this.findRealMetadata(module, module.metadata.metadata[metadata.name]);
    }
    else if (isMetadataModuleReferenceExpression(metadata)) {
      throw new NotImplementError();
    }
    else if (isMetadataImportedSymbolReferenceExpression(metadata)) {
      let currModule: SdModuleMetadata | undefined;
      if (metadata.module.startsWith(".")) {
        const moduleFilePath = path.resolve(path.dirname(module.filePath), metadata.module) + ".metadata.json";
        currModule = this.modules.single((item) => item.filePath === moduleFilePath);
      }
      else {
        currModule = this.modules.single((item) => item.name === metadata.module);
      }
      if (!currModule) throw new NotImplementError();
      return this.findRealMetadata(currModule, currModule.metadata.metadata[metadata.name]);
    }
    else if (isMetadataImportDefaultReference(metadata)) {
      throw new NotImplementError();
    }
    else {
      return {module, metadata};
    }
  }

  public getSdMetadata(module: SdModuleMetadata, metadata: MetadataEntry): TSdMetadata {
    const real = this.findRealMetadata(module, metadata);

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

    const pushItem = (sdMetadata: TSdMetadata | TSdMetadata[]) => {
      if (sdMetadata instanceof Array || sdMetadata instanceof SdArrayMetadata) {
        for (const sdMetadataItem of sdMetadata) {
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