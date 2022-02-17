import { SdCliBbRootMetadata } from "./SdCliBbRootMetadata";
import {
  ArrayExpression,
  isExpression,
  isIdentifier,
  isObjectProperty,
  isSpreadElement,
  NewExpression,
  ObjectExpression
} from "@babel/types";
import { NeverEntryError } from "@simplysm/sd-core-common";
import { SdCliBbFileMetadata, TSdCliBbValMetadata } from "./SdCliBbFileMetadata";

export class SdCliBbArrayMetadata {
  public constructor(private readonly _rootMetadata: SdCliBbRootMetadata,
                     private readonly _fileMetadata: SdCliBbFileMetadata,
                     private readonly _metadata: ArrayExpression) {
  }

  public get value(): TSdCliBbValMetadata[] {
    let result: TSdCliBbValMetadata[] = [];
    for (const el of this._metadata.elements) {
      if (isExpression(el)) {
        result.push(this._fileMetadata.getMetaFromExpr(el));
      }
      else if (isSpreadElement(el)) {
        const argMeta = this._fileMetadata.getMetaFromExpr(el.argument);
        if (argMeta instanceof SdCliBbArrayMetadata) {
          result.push(...argMeta.value);
        }
        else {
          throw new NeverEntryError();
        }
      }
      else {
        throw new NeverEntryError();
      }
    }
    return result;
  }
}

export class SdCliBbObjectMetadata {
  public constructor(private readonly _rootMetadata: SdCliBbRootMetadata,
                     private readonly _fileMetadata: SdCliBbFileMetadata,
                     private readonly _metadata: ObjectExpression) {
  }

  public getPropValue(propName: string): TSdCliBbValMetadata | undefined {
    const prop = this._metadata.properties
      .single((item) => (
        isObjectProperty(item) &&
        isIdentifier(item.key) &&
        item.key.name === propName
      ));
    if (prop && !isObjectProperty(prop)) {
      throw new NeverEntryError();
    }

    if (!prop) return undefined;
    if (isExpression(prop.value)) {
      return this._fileMetadata.getMetaFromExpr(prop.value);
    }
    else {
      throw new NeverEntryError();
    }
  }
}

export class SdCliBbNewMetadata {
  public constructor(private readonly _rootMetadata: SdCliBbRootMetadata,
                     private readonly _fileMetadata: SdCliBbFileMetadata,
                     private readonly _metadata: NewExpression) {
  }

  public get name(): string {
    if (isIdentifier(this._metadata.callee)) {
      return this._metadata.callee.name;
    }
    else {
      throw new NeverEntryError();
    }
  }

  public getArg(index: number): TSdCliBbValMetadata | undefined {
    const arg = this._metadata.arguments[index];
    if (this._metadata.arguments.length <= index) return undefined;

    if (isExpression(arg)) {
      return this._fileMetadata.getMetaFromExpr(arg);
    }
    else {
      throw new NeverEntryError();
    }
  }
}

export type TSdCliBbExpressionMetadata = SdCliBbArrayMetadata | SdCliBbObjectMetadata | SdCliBbNewMetadata | string;
