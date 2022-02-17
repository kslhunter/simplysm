import { SdCliBbRootMetadata } from "./SdCliBbRootMetadata";
import {
  isAssignmentExpression,
  isCallExpression,
  isExpressionStatement,
  isIdentifier,
  isMemberExpression,
  isObjectExpression
} from "@babel/types";
import { NeverEntryError } from "@simplysm/sd-core-common";
import { SdCliBbFileMetadata, TSdCliBbValMetadata } from "./SdCliBbFileMetadata";
import { SdCliBbArrayMetadata, SdCliBbNewMetadata, SdCliBbObjectMetadata } from "./SdCliBbExpressionMetadata";
import { SdCliBbClassMetadata } from "./SdCliBbDeclarationMetadata";

export class SdCliBbNgModuleDeclMetadata {
  public readonly moduleName: string;
  public readonly name: string;

  public constructor(private readonly _rootMetadata: SdCliBbRootMetadata,
                     private readonly _fileMetadata: SdCliBbFileMetadata,
                     private readonly _className: string) {
    this.moduleName = this._fileMetadata.moduleName;
    this.name = this._className;
  }

  public get def(): { exports: SdCliBbClassMetadata[]; providers: SdCliBbClassMetadata[] } {
    // TODO: staticProviders
    const result: {
      exports: SdCliBbClassMetadata[];
      providers: SdCliBbClassMetadata[];
    } = {
      exports: [],
      providers: []
    };

    for (const meta of this._fileMetadata.metadata) {
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
            // isMemberExpression(meta.expression.right.callee) &&
            meta.expression.right.arguments.length > 0 &&
            isObjectExpression(meta.expression.right.arguments[0])
          ) {
            const expObjMeta = new SdCliBbObjectMetadata(this._rootMetadata, this._fileMetadata, meta.expression.right.arguments[0]);
            const expVal = expObjMeta.getPropValue("exports");
            if (expVal !== undefined) {
              if (expVal instanceof SdCliBbArrayMetadata) {
                for (const expMeta of expVal.value) {
                  if (expMeta instanceof SdCliBbClassMetadata) {
                    result.exports.push(expMeta);
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
          }
          else {
            throw new NeverEntryError();
          }
        }
        if (meta.expression.left.property.name === "ɵinj") {
          if (
            isCallExpression(meta.expression.right) &&
            // isMemberExpression(meta.expression.right.callee) &&
            meta.expression.right.arguments.length > 0 &&
            isObjectExpression(meta.expression.right.arguments[0])
          ) {
            const provObjMeta = new SdCliBbObjectMetadata(this._rootMetadata, this._fileMetadata, meta.expression.right.arguments[0]);
            const provVal = provObjMeta.getPropValue("providers");
            if (provVal !== undefined) {
              result.providers.push(...this._getProviderMetas(provVal));
            }
          }
          else {
            throw new NeverEntryError();
          }
        }
      }
    }

    return result;
  }

  private _getProviderMetas(meta: TSdCliBbValMetadata): SdCliBbClassMetadata[] {
    const result: SdCliBbClassMetadata[] = [];

    if (meta instanceof SdCliBbClassMetadata) {
      result.push(meta);
    }
    else if (meta instanceof SdCliBbNewMetadata) {
      // 무시
      /*if (meta.name === "InjectionToken") {
        const arg0 = meta.getArg(0);
        if (typeof arg0 === "string") {
          result.push(arg0);
        }
        else {
          throw new NeverEntryError();
        }
      }
      else {
        throw new NeverEntryError();
      }*/
    }
    else if (meta instanceof SdCliBbArrayMetadata) {
      for (const metaItem of meta.value) {
        result.push(...this._getProviderMetas(metaItem));
      }
    }
    else if (meta instanceof SdCliBbObjectMetadata) {
      const metaPropVal = meta.getPropValue("provide");
      if (metaPropVal === undefined) {
        throw new NeverEntryError();
      }
      result.push(...this._getProviderMetas(metaPropVal));
    }
    else {
      throw new NeverEntryError();
    }

    return result;
  }
}

export class SdCliBbNgInjectableDeclMetadata {
  public constructor(private readonly _rootMetadata: SdCliBbRootMetadata,
                     private readonly _fileMetadata: SdCliBbFileMetadata,
                     private readonly _className: string) {
  }
}

export class SdCliBbNgDirectiveDeclMetadata {
  public constructor(private readonly _rootMetadata: SdCliBbRootMetadata,
                     private readonly _fileMetadata: SdCliBbFileMetadata,
                     private readonly _className: string) {
  }

  public get selector(): string {
    for (const meta of this._fileMetadata.metadata) {
      if (
        isExpressionStatement(meta) &&
        isAssignmentExpression(meta.expression) &&
        isMemberExpression(meta.expression.left) &&
        isIdentifier(meta.expression.left.object) &&
        meta.expression.left.object.name === this._className &&
        isIdentifier(meta.expression.left.property)
      ) {
        if (meta.expression.left.property.name === "ɵdir") {
          if (
            isCallExpression(meta.expression.right) &&
            meta.expression.right.arguments.length > 0 &&
            isObjectExpression(meta.expression.right.arguments[0])
          ) {
            const dirObjMeta = new SdCliBbObjectMetadata(this._rootMetadata, this._fileMetadata, meta.expression.right.arguments[0]);
            const provVal = dirObjMeta.getPropValue("selector");
            if (typeof provVal === "string") {
              return provVal;
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
    }


    throw new NeverEntryError();
  }
}

export class SdCliBbNgComponentDeclMetadata {
  public constructor(private readonly _rootMetadata: SdCliBbRootMetadata,
                     private readonly _fileMetadata: SdCliBbFileMetadata,
                     private readonly _className: string) {
  }

  public get selector(): string {
    for (const meta of this._fileMetadata.metadata) {
      if (
        isExpressionStatement(meta) &&
        isAssignmentExpression(meta.expression) &&
        isMemberExpression(meta.expression.left) &&
        isIdentifier(meta.expression.left.object) &&
        meta.expression.left.object.name === this._className &&
        isIdentifier(meta.expression.left.property)
      ) {
        if (meta.expression.left.property.name === "ɵcmp") {
          if (
            isCallExpression(meta.expression.right) &&
            meta.expression.right.arguments.length > 0 &&
            isObjectExpression(meta.expression.right.arguments[0])
          ) {
            const dirObjMeta = new SdCliBbObjectMetadata(this._rootMetadata, this._fileMetadata, meta.expression.right.arguments[0]);
            const provVal = dirObjMeta.getPropValue("selector");
            if (typeof provVal === "string") {
              return provVal;
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
    }

    throw new NeverEntryError();
  }
}

export class SdCliBbNgPipeDeclMetadata {
  public constructor(private readonly _rootMetadata: SdCliBbRootMetadata,
                     private readonly _fileMetadata: SdCliBbFileMetadata,
                     private readonly _className: string) {
  }

  public get name(): string {
    for (const meta of this._fileMetadata.metadata) {
      if (
        isExpressionStatement(meta) &&
        isAssignmentExpression(meta.expression) &&
        isMemberExpression(meta.expression.left) &&
        isIdentifier(meta.expression.left.object) &&
        meta.expression.left.object.name === this._className &&
        isIdentifier(meta.expression.left.property)
      ) {
        if (meta.expression.left.property.name === "ɵpipe") {
          if (
            isCallExpression(meta.expression.right) &&
            meta.expression.right.arguments.length > 0 &&
            isObjectExpression(meta.expression.right.arguments[0])
          ) {
            const dirObjMeta = new SdCliBbObjectMetadata(this._rootMetadata, this._fileMetadata, meta.expression.right.arguments[0]);
            const provVal = dirObjMeta.getPropValue("name");
            if (typeof provVal === "string") {
              return provVal;
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
    }

    throw new NeverEntryError();
  }
}

export type TSdCliBbNgDeclMetadata =
  SdCliBbNgModuleDeclMetadata
  | SdCliBbNgInjectableDeclMetadata
  | SdCliBbNgDirectiveDeclMetadata
  | SdCliBbNgComponentDeclMetadata
  | SdCliBbNgPipeDeclMetadata;
