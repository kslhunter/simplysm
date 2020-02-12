import {
  ClassMetadata,
  FunctionMetadata,
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
  MetadataError,
  MetadataObject,
  MetadataSymbolicCallExpression,
  MetadataSymbolicReferenceExpression,
  ModuleMetadata
} from "@angular/compiler-cli";
import {FsUtil} from "@simplysm/sd-core-node";
import {NotImplementError} from "@simplysm/sd-core-common";
import * as path from "path";

export class SdMetadataCollector {
  public moduleMetadataListObj: { [filePath: string]: ModuleMetadata[] } = {};

  public get modules(): SdModuleMetadata[] {
    return Object.keys(this.moduleMetadataListObj)
      .mapMany((key) =>
        this.moduleMetadataListObj[key]
          .map((metadata) => new SdModuleMetadata(this, metadata, key))
      );
  }

  public constructor(public rootPath: string) {
  }

  public async registerAsync(metadataFilePath: string): Promise<void> {
    const metadata = await FsUtil.readJsonAsync(metadataFilePath);
    this.moduleMetadataListObj[path.resolve(metadataFilePath)] = metadata instanceof Array ? metadata : [metadata];
  }

  public unregister(metadataFilePath: string): void {
    delete this.moduleMetadataListObj[path.resolve(metadataFilePath)];
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

export class SdModuleMetadata {
  public readonly name: string;
  public readonly isLibrary: boolean;
  public readonly items: { [key: string]: TSdMetadata };

  public constructor(public pkg: SdMetadataCollector,
                     public metadata: ModuleMetadata,
                     public filePath: string) {
    // name
    this.name = this.metadata.importAs ?? this._getNpmConfig().name;

    // isLibrary
    this.isLibrary = path.relative(this.pkg.rootPath, filePath).includes("..");

    // items
    if (!this.metadata.metadata) throw new NotImplementError();
    const itemMetadata = this.metadata.metadata as MetadataEntry;
    if (!isMetadataObjectExpression(itemMetadata)) throw new NotImplementError();
    this.items = this.pkg.getSdMetadataObject(this, itemMetadata);
  }

  private _getNpmConfig(): any {
    let cursorDirPath = path.dirname(this.filePath);
    while (true) {
      if (FsUtil.exists(path.resolve(cursorDirPath, "package.json"))) {
        break;
      }
      cursorDirPath = path.dirname(cursorDirPath);
    }
    const npmConfigFilePath = path.resolve(cursorDirPath, "package.json");
    return FsUtil.readJson(npmConfigFilePath);
  }
}

export abstract class SdMetadataBase {
  public abstract module: SdModuleMetadata;
}

export class SdClassMetadata extends SdMetadataBase {
  public get decorators(): SdCallMetadata[] {
    const metadata = this.metadata.decorators ?? [] as MetadataArray;

    const real = this.pkg.findRealMetadata(this.module, metadata);
    if (!isMetadataArrayExpression(real.metadata)) throw new NotImplementError();
    const arr = this.pkg.getSdMetadataArray(real.module, real.metadata);

    return arr.map((item) => {
      if (!(item instanceof SdCallMetadata)) throw new NotImplementError();
      return item;
    });
  }

  public get statics(): { [key: string]: TSdMetadata } {
    if (this.metadata.statics) {
      const metadata = this.metadata.statics as MetadataEntry;
      const real = this.pkg.findRealMetadata(this.module, metadata);
      if (!isMetadataObjectExpression(real.metadata)) throw new NotImplementError();
      return this.pkg.getSdMetadataObject(real.module, real.metadata);
    }

    return {};
  }

  public get name(): string | undefined {
    return Object.keys(this.module.metadata.metadata)
      .single((key) => this.module.metadata.metadata[key] === this.metadata);
  }

  public constructor(public pkg: SdMetadataCollector,
                     public module: SdModuleMetadata,
                     public metadata: ClassMetadata) {
    super();
  }
}

export class SdCallMetadata extends SdMetadataBase {
  public get expression(): { module: string; name: string } {
    if (isMetadataImportedSymbolReferenceExpression(this.metadata.expression)) {
      return {
        module: this.metadata.expression.module,
        name: this.metadata.expression.name
      };
    }
    else if (isMetadataGlobalReferenceExpression(this.metadata.expression)) {
      return {
        module: this.module.name,
        name: this.metadata.expression.name
      };
    }
    else {
      throw new NotImplementError();
    }
  }

  public get arguments(): TSdMetadata[] {
    const metadata = this.metadata.arguments ?? [] as MetadataArray;

    const real = this.pkg.findRealMetadata(this.module, metadata);
    if (!isMetadataArrayExpression(real.metadata)) throw new NotImplementError();
    return this.pkg.getSdMetadataArray(real.module, real.metadata);
  }

  public constructor(public pkg: SdMetadataCollector,
                     public module: SdModuleMetadata,
                     public metadata: MetadataSymbolicCallExpression) {
    super();
  }
}

export class SdObjectMetadata extends SdMetadataBase {
  public get(key: string): TSdMetadata {
    const realObj = this.pkg.findRealMetadata(this.module, this.metadata);
    if (!isMetadataObjectExpression(realObj.metadata)) throw new NotImplementError();

    if (realObj.metadata[key]) {
      return this.pkg.getSdMetadata(this.module, realObj.metadata[key]);
    }
    else {
      return undefined;
    }
  }

  public keys(): string[] {
    const real = this.pkg.findRealMetadata(this.module, this.metadata);
    if (!isMetadataObjectExpression(real.metadata)) throw new NotImplementError();
    return Object.keys(real.metadata);
  }

  public constructor(public pkg: SdMetadataCollector,
                     public module: SdModuleMetadata,
                     public metadata: MetadataObject) {
    super();
  }
}

export class SdArrayMetadata extends SdMetadataBase implements Iterable<TSdMetadata> {
  public sdMetadataList: TSdMetadata[];

  public [Symbol.iterator](): Iterator<TSdMetadata> {
    let index = 0;
    return {
      next: () => {
        const value = this.sdMetadataList[index];
        index++;

        return {
          done: index > this.sdMetadataList.length,
          value
        };
      }
    };
  }

  public constructor(public pkg: SdMetadataCollector,
                     public module: SdModuleMetadata,
                     public arr: MetadataArray) {
    super();

    this.sdMetadataList = this.pkg.getSdMetadataArray(module, arr);
  }
}

export class SdFunctionMetadata extends SdMetadataBase {
  public get value(): TSdMetadata {
    return this.pkg.getSdMetadata(this.module, this.metadata.value);
  }

  public constructor(public pkg: SdMetadataCollector,
                     public module: SdModuleMetadata,
                     public metadata: FunctionMetadata) {
    super();
  }
}

/*export class SdInterfaceMetadata extends SdMetadataBase {
  public constructor(public pkg: SdPackageMetadata,
                     public module: SdModuleMetadata,
                     public metadata: InterfaceMetadata) {
    super();
  }
}*/

export class SdErrorMetadata extends SdMetadataBase {
  public constructor(public pkg: SdMetadataCollector,
                     public module: SdModuleMetadata,
                     public metadata: MetadataError) {
    super();
  }
}

export function isMetadataObjectExpression(metadata: MetadataEntry): metadata is MetadataObject {
  return metadata != undefined &&
    !metadata["__symbolic"] &&
    !(metadata instanceof Array) &&
    typeof metadata === "object";
}

export function isMetadataArrayExpression(metadata: MetadataEntry): metadata is MetadataArray & MetadataEntry[] {
  return metadata != undefined && metadata instanceof Array;
}

export type TSdMetadata = SdMetadataBase | string | number | boolean | undefined;