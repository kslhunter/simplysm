import * as ts from "typescript";
import { NeverEntryError } from "@simplysm/sd-core-common";
import { FsUtil, PathUtil } from "@simplysm/sd-core-node";
import { isNamedClassDeclaration } from "@angular/compiler-cli/src/ngtsc/reflection";
import { MetadataReader } from "@angular/compiler-cli/src/ngtsc/metadata";
import { Reference } from "@angular/compiler-cli/src/ngtsc/imports";
import { NgtscProgram } from "@angular/compiler-cli";
import * as path from "path";
import { INpmConfig } from "../../commons";
import { IMyModuleImport } from "./SdMyMetadataReader";
import { SdMetadataError } from "./SdMetadataError";

export class SdIvyMetadataReader {
  private readonly _typeChecker: ts.TypeChecker;
  private readonly _metaReader: MetadataReader;

  public constructor(private readonly _sourceFile: ts.SourceFile,
                     private readonly _ngProgram: NgtscProgram) {
    const program = this._ngProgram.getTsProgram();
    const ngCompiler = this._ngProgram.compiler;

    this._typeChecker = program.getTypeChecker();
    this._metaReader = ngCompiler["ensureAnalyzed"]().metaReader;
  }

  public getMetadatas(): IIvyModuleDefMetadata {
    const result: IIvyModuleDefMetadata = {
      moduleName: this._sourceFile.moduleName ?? this.getPackageName(),
      metadata: []
    };

    ts.forEachChild(this._sourceFile, (node) => {
      if (!isNamedClassDeclaration(node)) return;
      const className = node.name.text;

      // BrowserModule, ApplicationModule 두가지는 무시함
      if (className === "BrowserModule" || className === "ApplicationModule") {
        return;
      }

      const ngModuleMeta = this._metaReader.getNgModuleMetadata(new Reference(node));
      if (ngModuleMeta) {
        result.metadata.push({
          type: "NgModule",
          className,
          exports: ngModuleMeta.exports.map((item) => this._getAliasedModuleImportInfo(item.node.name))
        });
      }

      const pipeMeta = this._metaReader.getPipeMetadata(new Reference(node));
      if (pipeMeta) {
        result.metadata.push({
          type: "Pipe",
          className,
          name: pipeMeta.name
        });
      }

      const directiveMeta = this._metaReader.getDirectiveMetadata(new Reference(node));
      if (directiveMeta) {
        if (directiveMeta.isComponent) {
          result.metadata.push({
            type: "Component",
            className,
            selector: directiveMeta.selector ?? undefined
          });
        }
        else {
          result.metadata.push({
            type: "Directive",
            className,
            selector: directiveMeta.selector ?? undefined
          });
        }
      }
    });

    return result;
  }

  private _getAliasedModuleImportInfo(identifier: ts.Identifier): IMyModuleImport {
    const moduleSymbol = this._typeChecker.getSymbolAtLocation(identifier);
    if (!moduleSymbol) throw new NeverEntryError();
    if (moduleSymbol.valueDeclaration) {
      const moduleFilePath = PathUtil.posix(moduleSymbol.valueDeclaration.getSourceFile().fileName);
      return { name: identifier.text, moduleFilePath };
    }
    else {
      const aliasedTargetSymbol = this._typeChecker.getAliasedSymbol(moduleSymbol);
      const declarations = aliasedTargetSymbol.getDeclarations();
      if (!declarations || declarations.length < 1) {
        throw new SdMetadataError(this._sourceFile.fileName, `'${identifier.text}'를 찾을 수 없습니다.`);
      }

      if (declarations.length === 1) {
        return { name: identifier.text, moduleFilePath: PathUtil.posix(declarations[0].getSourceFile().fileName) };
      }

      const moduleFilePaths = declarations
        .filter((item) => (
          this._hasParentsOrMe(item, (item1) => Boolean(item1.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword)))
        ))
        .map((item) => PathUtil.posix(item.getSourceFile().fileName))
        .distinct();
      if (moduleFilePaths.length === 0) {
        throw new SdMetadataError(this._sourceFile.fileName, `'${identifier.text}'의 경로를 찾을 수 없습니다.`);
      }
      if (moduleFilePaths.length !== 1) {
        throw new SdMetadataError(this._sourceFile.fileName, `'${identifier.text}'의 경로가 중복되었습니다.\n${moduleFilePaths.join("\n")}`);
      }

      const moduleFilePath = moduleFilePaths[0];

      return { name: identifier.text, moduleFilePath };
    }
  }

  private _hasParentsOrMe(node: ts.Node, fn: (node1: ts.Node) => boolean): boolean {
    let currNode = node as ts.Node | undefined;
    while (true) {
      if (!currNode) return false;

      const result = fn(currNode);
      if (result) return true;

      currNode = currNode.parent as ts.Node | undefined;
    }
  }

  private getPackageName(): string {
    let cursorDirPath = path.dirname(this._sourceFile.fileName);
    while (true) {
      if (FsUtil.exists(path.resolve(cursorDirPath, "package.json"))) {
        break;
      }
      cursorDirPath = path.dirname(cursorDirPath);
    }
    const npmConfigFilePath = path.resolve(cursorDirPath, "package.json");
    const npmConfig: INpmConfig = FsUtil.readJson(npmConfigFilePath);
    return npmConfig.name;
  }
}


export interface IIvyModuleDefMetadata {
  moduleName: string;
  metadata: TIvyNgMetadata[];
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
