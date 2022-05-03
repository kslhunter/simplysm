import { SdCliBbRootMetadata } from "./SdCliBbRootMetadata";
import {
  ClassDeclaration,
  FunctionDeclaration,
  isAssignmentExpression,
  isExpression,
  isExpressionStatement,
  isIdentifier,
  isMemberExpression,
  VariableDeclarator
} from "@babel/types";
import { NeverEntryError } from "@simplysm/sd-core-common";
import { SdCliBbFileMetadata, TSdCliBbValMetadata } from "./SdCliBbFileMetadata";
import {
  SdCliBbNgComponentDeclMetadata,
  SdCliBbNgDirectiveDeclMetadata,
  SdCliBbNgInjectableDeclMetadata,
  SdCliBbNgModuleDeclMetadata,
  SdCliBbNgPipeDeclMetadata,
  TSdCliBbNgDeclMetadata
} from "./TSdCliBbNgDeclMetadata";


export class SdCliBbClassMetadata {
  public constructor(private readonly _rootMetadata: SdCliBbRootMetadata,
                     private readonly _fileMetadata: SdCliBbFileMetadata,
                     private readonly _metadata: ClassDeclaration) {
  }

  public get moduleName(): string {
    return this._fileMetadata.moduleName;
  }

  public get name(): string {
    return this._metadata.id.name;
  }

  public get ngDecl(): TSdCliBbNgDeclMetadata | undefined {
    for (const meta of this._fileMetadata.metadata) {
      if (
        isExpressionStatement(meta) &&
        isAssignmentExpression(meta.expression) &&
        isMemberExpression(meta.expression.left) &&
        isIdentifier(meta.expression.left.object) &&
        meta.expression.left.object.name === this.name &&
        isIdentifier(meta.expression.left.property)
      ) {
        if (meta.expression.left.property.name === "ɵmod") {
          return new SdCliBbNgModuleDeclMetadata(this._rootMetadata, this._fileMetadata, this.name);
        }
        else if (meta.expression.left.property.name === "ɵprov") {
          return new SdCliBbNgInjectableDeclMetadata(this._rootMetadata, this._fileMetadata, this.name);
        }
        else if (meta.expression.left.property.name === "ɵdir") {
          return new SdCliBbNgDirectiveDeclMetadata(this._rootMetadata, this._fileMetadata, this.name);
        }
        else if (meta.expression.left.property.name === "ɵcmp") {
          return new SdCliBbNgComponentDeclMetadata(this._rootMetadata, this._fileMetadata, this.name);
        }
        else if (meta.expression.left.property.name === "ɵpipe") {
          return new SdCliBbNgPipeDeclMetadata(this._rootMetadata, this._fileMetadata, this.name);
        }
      }
    }

    return undefined;
  }
}

export class SdCliBbVariableMetadata {
  public constructor(private readonly _rootMetadata: SdCliBbRootMetadata,
                     private readonly _fileMetadata: SdCliBbFileMetadata,
                     private readonly _metadata: VariableDeclarator) {
  }

  public get value(): TSdCliBbValMetadata {
    if (isExpression(this._metadata.init)) {
      return this._fileMetadata.getMetaFromExpr(this._metadata.init);
    }
    else {
      throw new NeverEntryError();
    }
  }
}

export class SdCliBbFunctionMetadata {
  public constructor(private readonly _rootMetadata: SdCliBbRootMetadata,
                     private readonly _fileMetadata: SdCliBbFileMetadata,
                     private readonly _metadata: FunctionDeclaration) {
  }
}

export type TSdCliBbDeclarationMetadata = SdCliBbClassMetadata | SdCliBbVariableMetadata | SdCliBbFunctionMetadata;
