import { NeverEntryError } from "@simplysm/sd-core-common";
import { SdCliBbFileMetadata } from "./SdCliBbFileMetadata";
import { SdCliBbArrayMetadata, SdCliBbVariableMetadata } from "./TSdCliBbTypeMetadata";
import { TSdCliBbMetadata } from "./SdCliBbRootMetadata";

export type TSdCliBbNgMetadata =
  SdCliBbNgModuleMetadata
  | SdCliBbNgInjectableMetadata
  | SdCliBbNgDirectiveMetadata
  | SdCliBbNgComponentMetadata
  | SdCliBbNgPipeMetadata;

export class SdCliBbNgModuleMetadata {
  public constructor(private readonly _fileMeta: SdCliBbFileMetadata,
                     private readonly _className: string) {
  }

  private _defCache?: ISdCliBbNgModuleDef;

  public get def(): ISdCliBbNgModuleDef {
    if (this._defCache) return this._defCache;

    const result: ISdCliBbNgModuleDef = {
      exports: [],
      providers: []
    };

    const argObjMeta = this._fileMeta.getNgDecoArg(this._className);

    const expVal = argObjMeta.getPropValue("exports") ?? this._fileMeta.getNgDecoPropValue(this._className, "ɵmod", "exports");
    if (expVal !== undefined) {
      const expMetas = this._getExportAndProviderMetas(expVal);
      result.exports.push(...expMetas);
    }

    const provVal = argObjMeta.getPropValue("providers") ?? this._fileMeta.getNgDecoPropValue(this._className, "ɵmod", "providers");
    if (provVal !== undefined) {
      const provMetas = this._getExportAndProviderMetas(provVal);
      result.providers.push(...provMetas);
    }

    /*for (const meta of this._fileMeta.rawMetas) {
      if (
        isExpressionStatement(meta) &&
        isAssignmentExpression(meta.expression) &&
        isMemberExpression(meta.expression.left) &&
        isIdentifier(meta.expression.left.object) &&
        meta.expression.left.object.name === this._className &&
        isIdentifier(meta.expression.left.property)
      ) {
        if (meta.expression.left.property.name === "ɵmod") {
          if (
            isCallExpression(meta.expression.right) &&
            meta.expression.right.arguments.length > 0 &&
            isObjectExpression(meta.expression.right.arguments[0])
          ) {
            const expObjMeta = new SdCliBbObjectMetadata(this._fileMeta, meta.expression.right.arguments[0]);
            const expVal = expObjMeta.getPropValue("exports");
            if (expVal !== undefined) {
              if (expVal instanceof SdCliBbArrayMetadata) {
                for (const expMeta of expVal.value.filterExists()) {
                  result.exports.push(expMeta);
                }
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

        if (meta.expression.left.property.name === "ɵinj") {
          if (
            isCallExpression(meta.expression.right) &&
            meta.expression.right.arguments.length > 0 &&
            isObjectExpression(meta.expression.right.arguments[0])
          ) {
            const provObjMeta = new SdCliBbObjectMetadata(this._fileMeta, meta.expression.right.arguments[0]);
            const provVal = provObjMeta.getPropValue("providers");
            if (provVal !== undefined) {
              const provMetas = this._getProviderMetas(provVal);
              for (const provMeta of provMetas) {
                result.providers.push(provMeta);
              }
            }
          }
          else {
            throw new NeverEntryError();
          }
        }
      }
    }*/

    this._defCache = result;
    return result;
  }

  private _getExportAndProviderMetas(meta: TSdCliBbMetadata): TSdCliBbMetadata[] {
    const result: TSdCliBbMetadata[] = [];

    if (meta instanceof SdCliBbArrayMetadata) {
      for (const metaItem of meta.value.filterExists()) {
        result.push(...this._getExportAndProviderMetas(metaItem));
      }
    }
    else if (meta instanceof SdCliBbVariableMetadata) {
      if (meta.value !== undefined) {
        result.push(...this._getExportAndProviderMetas(meta.value));
      }
    }
    else {
      result.push(meta);
    }

    return result;
  }
}

export class SdCliBbNgInjectableMetadata {

  public constructor(
    // @ts-expect-error
    private readonly _fileMeta: SdCliBbFileMetadata,
    // @ts-expect-error
    private readonly _className: string) {
  }
}

export class SdCliBbNgDirectiveMetadata {
  public constructor(private readonly _fileMeta: SdCliBbFileMetadata,
                     private readonly _className: string) {
  }

  private _selectorCache?: string;

  public get selector(): string {
    if (this._selectorCache !== undefined) return this._selectorCache;

    const argObjMeta = this._fileMeta.getNgDecoArg(this._className);
    const val = argObjMeta.getPropValue("selector") ?? this._fileMeta.getNgDecoPropValue(this._className, "ɵdir", "selector");
    if (typeof val === "string") {
      this._selectorCache = val;
      return this._selectorCache;
    }
    else {
      throw new NeverEntryError();
    }
  }
}

export class SdCliBbNgComponentMetadata {
  public constructor(private readonly _fileMeta: SdCliBbFileMetadata,
                     private readonly _className: string) {
  }

  private _selectorCache?: string;

  public get selector(): string {
    if (this._selectorCache !== undefined) return this._selectorCache;

    const argObjMeta = this._fileMeta.getNgDecoArg(this._className);
    const val = argObjMeta.getPropValue("selector") ?? this._fileMeta.getNgDecoPropValue(this._className, "ɵcmp", "selector");
    if (typeof val === "string") {
      this._selectorCache = val;
      return this._selectorCache;
    }
    else {
      throw new NeverEntryError();
    }
  }
}

export class SdCliBbNgPipeMetadata {
  public constructor(private readonly _fileMeta: SdCliBbFileMetadata,
                     private readonly _className: string) {
  }

  private _pipeNameCache?: string;

  public get pipeName(): string {
    if (this._pipeNameCache !== undefined) return this._pipeNameCache;

    const argObjMeta = this._fileMeta.getNgDecoArg(this._className);
    const val = argObjMeta.getPropValue("name") ?? this._fileMeta.getNgDecoPropValue(this._className, "ɵpipe", "name");
    if (typeof val === "string") {
      this._pipeNameCache = val;
      return val;
    }
    else {
      throw new NeverEntryError();
    }
  }
}

interface ISdCliBbNgModuleDef {
  exports: TSdCliBbMetadata[];
  providers: TSdCliBbMetadata[];
}

/*
class SdCliNgMetadataUtil {
  public static getDecoPropValue(fileMeta: SdCliBbFileMetadata, className: string, decoName: string, propName: string): TSdCliBbMetadata | undefined {
    for (const meta of fileMeta.rawMetas) {
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
            const dirObjMeta = new SdCliBbObjectMetadata(fileMeta, meta.expression.right.arguments[0]);
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
*/
