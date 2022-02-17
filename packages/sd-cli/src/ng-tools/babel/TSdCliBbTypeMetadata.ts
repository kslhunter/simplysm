import {
  ArrayExpression,
  ClassDeclaration,
  FunctionDeclaration,
  isAssignmentExpression,
  isExpressionStatement,
  isIdentifier,
  isMemberExpression,
  isObjectProperty,
  ObjectExpression,
  VariableDeclarator
} from "@babel/types";
import { NeverEntryError } from "@simplysm/sd-core-common";
import { SdCliBbFileMetadata } from "./SdCliBbFileMetadata";
import {
  SdCliBbNgComponentMetadata,
  SdCliBbNgDirectiveMetadata,
  SdCliBbNgInjectableMetadata,
  SdCliBbNgModuleMetadata,
  SdCliBbNgPipeMetadata,
  TSdCliBbNgMetadata
} from "./TSdCliBbNgMetadata";
import { TSdCliBbMetadata } from "./SdCliBbRootMetadata";

export type TSdCliBbTypeMetadata = SdCliBbClassMetadata |
  SdCliBbVariableMetadata |
  SdCliBbFunctionMetadata |
  SdCliBbObjectMetadata |
  SdCliBbArrayMetadata;

export class SdCliBbClassMetadata {
  public constructor(private readonly _fileMeta: SdCliBbFileMetadata,
                     private readonly _rawMeta: ClassDeclaration) {
  }

  public get filePath(): string {
    return this._fileMeta.filePath;
  }

  public get name(): string {
    return this._rawMeta.id.name;
  }

  private _ngDeclCache?: TSdCliBbNgMetadata | "none";

  public get ngDecl(): TSdCliBbNgMetadata | undefined {
    if (this._ngDeclCache !== undefined) {
      return this._ngDeclCache === "none" ? undefined : this._ngDeclCache;
    }

    for (const meta of this._fileMeta.rawMetas) {
      if (
        isExpressionStatement(meta) &&
        isAssignmentExpression(meta.expression) &&
        isMemberExpression(meta.expression.left) &&
        isIdentifier(meta.expression.left.object) &&
        meta.expression.left.object.name === this._rawMeta.id.name &&
        isIdentifier(meta.expression.left.property)
      ) {
        if (meta.expression.left.property.name === "ɵmod") {
          this._ngDeclCache = new SdCliBbNgModuleMetadata(this._fileMeta, this._rawMeta.id.name);
          return this._ngDeclCache;
        }
        else if (meta.expression.left.property.name === "ɵprov") {
          this._ngDeclCache = new SdCliBbNgInjectableMetadata(this._fileMeta, this._rawMeta.id.name);
          return this._ngDeclCache;
        }
        else if (meta.expression.left.property.name === "ɵdir") {
          this._ngDeclCache = new SdCliBbNgDirectiveMetadata(this._fileMeta, this._rawMeta.id.name);
          return this._ngDeclCache;
        }
        else if (meta.expression.left.property.name === "ɵcmp") {
          this._ngDeclCache = new SdCliBbNgComponentMetadata(this._fileMeta, this._rawMeta.id.name);
          return this._ngDeclCache;
        }
        else if (meta.expression.left.property.name === "ɵpipe") {
          this._ngDeclCache = new SdCliBbNgPipeMetadata(this._fileMeta, this._rawMeta.id.name);
          return this._ngDeclCache;
        }
      }
    }

    this._ngDeclCache = "none";
    return undefined;
  }
}

export class SdCliBbVariableMetadata {
  public constructor(private readonly _fileMeta: SdCliBbFileMetadata,
                     private readonly _rawMeta: VariableDeclarator) {
  }

  public get filePath(): string {
    return this._fileMeta.filePath;
  }

  public get name(): string {
    if (!isIdentifier(this._rawMeta.id)) throw new NeverEntryError();
    return this._rawMeta.id.name;
  }

  private _valueCache?: TSdCliBbMetadata;

  public get value(): TSdCliBbMetadata | undefined {
    if (this._valueCache === undefined) {
      this._valueCache = this._rawMeta.init == null ? undefined : this._fileMeta.getMetaFromRaw(this._rawMeta.init);
    }

    return this._valueCache;
  }
}

export class SdCliBbFunctionMetadata {
  public constructor(private readonly _fileMeta: SdCliBbFileMetadata,
                     private readonly _rawMeta: FunctionDeclaration) {
  }

  public get filePath(): string {
    return this._fileMeta.filePath;
  }

  public get name(): string {
    if (!isIdentifier(this._rawMeta.id)) throw new NeverEntryError();
    return this._rawMeta.id.name;
  }
}

export class SdCliBbObjectMetadata {
  public constructor(private readonly _fileMeta: SdCliBbFileMetadata,
                     private readonly _metadata: ObjectExpression) {
  }

  private readonly _getPropValueCache = new Map<string, TSdCliBbMetadata | undefined>();

  public getPropValue(propName: string): TSdCliBbMetadata | undefined {
    if (this._getPropValueCache.has(propName)) {
      return this._getPropValueCache.get(propName);
    }

    const prop = this._metadata.properties
      .single((item) => (
        isObjectProperty(item) &&
        isIdentifier(item.key) &&
        item.key.name === propName
      ));
    if (prop && !isObjectProperty(prop)) {
      throw new NeverEntryError();
    }

    if (!prop) {
      this._getPropValueCache.set(propName, undefined);
      return undefined;
    }

    const result = this._fileMeta.getMetaFromRaw(prop.value);
    this._getPropValueCache.set(propName, result);
    return result;
  }
}

export class SdCliBbArrayMetadata {
  public constructor(private readonly _fileMeta: SdCliBbFileMetadata,
                     private readonly _metadata: ArrayExpression) {
  }

  private _valueCache?: (TSdCliBbMetadata | undefined)[];

  public get value(): (TSdCliBbMetadata | undefined)[] {
    if (this._valueCache === undefined) {
      this._valueCache = [];
      for (const el of this._metadata.elements) {
        this._valueCache.push(el ? this._fileMeta.getMetaFromRaw(el) : undefined);
      }
    }
    return this._valueCache;
  }
}
