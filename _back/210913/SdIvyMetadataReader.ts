import * as ts from "typescript";

export class SdIvyMetadataReader {
  private readonly _typeChecker: ts.TypeChecker;

  public constructor(private readonly _sourceFile: ts.SourceFile,
                     private readonly _program: ts.Program) {
    this._typeChecker = this._program.getTypeChecker();
  }

  public getMetadatas(): TIvyNgMetadata[] {
    const result: TIvyNgMetadata[] = [];

    ts.forEachChild(this._sourceFile, (node) => {
      if (!ts.isClassDeclaration(node) || !node.name) return;
      if (!node.modifiers || !node.modifiers.some((item) => item.kind === ts.SyntaxKind.ExportKeyword)) return;
      const className = node.name.text;
      if(className === "HttpClientModule"){
        console.log(className, node.members);
      }
    });

    return result;
  }
}

export type TIvyNgMetadata =
  IIvyNgModuleMetadata
  | IIvyDirectiveMetadata
  | IIvyPipeMetadata
  | IIvyComponentMetadata;

export interface IIvyNgModuleMetadata {
  type: "NgModule";
  className: string;
  exports: IIvyModuleImport[];
}

export interface IIvyDirectiveMetadata {
  type: "Directive";
  className: string;
  selector?: string;
}

export interface IIvyPipeMetadata {
  type: "Pipe";
  className: string;
  name?: string;
}

export interface IIvyComponentMetadata {
  type: "Component";
  className: string;
  selector?: string;
}

export interface IIvyModuleImport {
  moduleFilePath: string;
  name: string;
}
