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

  private _ngDecl: TSdCliBbNgMetadata | "none" | undefined;

  public get ngDecl(): TSdCliBbNgMetadata | undefined {
    if (this._ngDecl !== undefined) {
      return this._ngDecl === "none" ? undefined : this._ngDecl;
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
          this._ngDecl = new SdCliBbNgModuleMetadata(this._fileMeta, this._rawMeta.id.name);
          return this._ngDecl;
        }
        else if (meta.expression.left.property.name === "ɵprov") {
          this._ngDecl = new SdCliBbNgInjectableMetadata(this._fileMeta, this._rawMeta.id.name);
          return this._ngDecl;
        }
        else if (meta.expression.left.property.name === "ɵdir") {
          this._ngDecl = new SdCliBbNgDirectiveMetadata(this._fileMeta, this._rawMeta.id.name);
          return this._ngDecl;
        }
        else if (meta.expression.left.property.name === "ɵcmp") {
          this._ngDecl = new SdCliBbNgComponentMetadata(this._fileMeta, this._rawMeta.id.name);
          return this._ngDecl;
        }
        else if (meta.expression.left.property.name === "ɵpipe") {
          this._ngDecl = new SdCliBbNgPipeMetadata(this._fileMeta, this._rawMeta.id.name);
          return this._ngDecl;
        }
      }
    }

    this._ngDecl = "none";
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

  public get value(): TSdCliBbMetadata | undefined {
    return this._rawMeta.init == null ? undefined : this._fileMeta.getMetaFromRaw(this._rawMeta.init);
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

  public getPropValue(propName: string): TSdCliBbMetadata | undefined {
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
    return this._fileMeta.getMetaFromRaw(prop.value);
  }
}

export class SdCliBbArrayMetadata {
  public constructor(private readonly _fileMeta: SdCliBbFileMetadata,
                     private readonly _metadata: ArrayExpression) {
  }

  public get value(): (TSdCliBbMetadata | undefined)[] {
    let result: (TSdCliBbMetadata | undefined)[] = [];
    for (const el of this._metadata.elements) {
      result.push(el ? this._fileMeta.getMetaFromRaw(el) : undefined);
    }
    return result;
  }
}
