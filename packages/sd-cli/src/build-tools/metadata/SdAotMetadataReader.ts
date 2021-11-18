import {
  ClassMetadata,
  isClassMetadata,
  isMetadataGlobalReferenceExpression,
  isMetadataImportedSymbolReferenceExpression,
  isMetadataSymbolicCallExpression,
  isMetadataSymbolicIfExpression,
  isMetadataSymbolicReferenceExpression,
  MetadataEntry,
  MetadataObject,
  MetadataSymbolicCallExpression,
  ModuleMetadata
} from "@angular/compiler-cli";
import { NeverEntryError, StringUtil } from "@simplysm/sd-core-common";

export class SdAotMetadataReader {
  public constructor(private readonly _metadataRoot: ModuleMetadata) {
  }

  public getMetadatas(): IAotModuleDefMetadata {
    if (StringUtil.isNullOrEmpty(this._metadataRoot.importAs)) {
      throw new NeverEntryError();
    }

    const result: IAotModuleDefMetadata = {
      moduleName: this._metadataRoot.importAs,
      exports: [],
      metadata: []
    };

    for (const metadataName of Object.keys(this._metadataRoot.metadata)) {
      const metadata = this._metadataRoot.metadata[metadataName];
      if (!isClassMetadata(metadata)) continue;
      const className = metadataName;

      // BrowserModule, ApplicationModule 두가지는 무시함
      if (className === "BrowserModule" || className === "ApplicationModule") {
        continue;
      }

      const ngModuleDec = this._getDecorator(metadata, "NgModule");
      if (ngModuleDec) {
        const decParam = this._getNgModuleDecoratorParam(ngModuleDec);
        const staticProviders = this.getNgModuleStaticProviders(metadata);
        result.metadata.push({
          type: "NgModule",
          className,
          exports: decParam.exports,
          providers: [
            ...decParam.providers,
            ...staticProviders
          ]
        });
      }

      const injectableDec = this._getDecorator(metadata, "Injectable");
      if (injectableDec) {
        result.metadata.push({
          type: "Injectable",
          className,
          ...this._getInjectableDecoratorParam(injectableDec)
        });
      }

      const directiveDec = this._getDecorator(metadata, "Directive");
      if (directiveDec) {
        result.metadata.push({
          type: "Directive",
          className,
          ...this._getDirectiveDecoratorParam(directiveDec)
        });
      }

      const pipeDec = this._getDecorator(metadata, "Pipe");
      if (pipeDec) {
        result.metadata.push({
          type: "Pipe",
          className,
          ...this._getPipeDecoratorParam(pipeDec)
        });
      }

      const componentDec = this._getDecorator(metadata, "Component");
      if (componentDec) {
        result.metadata.push({
          type: "Component",
          className,
          ...this._getComponentDecoratorParam(componentDec)
        });
      }
    }

    result.exports.push(...this._getModuleExports());

    return result;
  }

  private _getDecorator(metadata: ClassMetadata, name: string): MetadataSymbolicCallExpression | undefined {
    if (!metadata.decorators) return undefined;

    for (const dec of metadata.decorators) {
      if (!isMetadataSymbolicCallExpression(dec)) throw new NeverEntryError();
      if (!isMetadataSymbolicReferenceExpression(dec.expression)) throw new NeverEntryError();
      const decTargets = this._getReferenceTargets(dec.expression);
      if (decTargets.length !== 1) throw new NeverEntryError();

      if (decTargets[0].lastName === name) return dec;
    }

    return undefined;
  }

  private _getModuleExports(): IAotModuleExport[] {
    const exports: IAotModuleExport[] = [];

    for (const metadataName of Object.keys(this._metadataRoot.metadata)) {
      exports.push({ moduleName: undefined, name: metadataName, as: undefined });
    }

    if (this._metadataRoot.exports) {
      for (const exp of this._metadataRoot.exports) {
        if (exp.export) {
          for (const expexp of exp.export) {
            if (typeof expexp === "string") {
              exports.push({ moduleName: exp.from, name: expexp, as: undefined });
            }
            else {
              exports.push({ moduleName: exp.from, name: expexp.name, as: expexp.as });
            }
          }
        }
        else {
          exports.push({ moduleName: exp.from, name: undefined, as: undefined });
        }
      }
    }

    return exports;
  }

  private _getDirectiveDecoratorParam(dec: MetadataSymbolicCallExpression): { selector?: string } {
    const result: { selector?: string } = {};

    if (!dec.arguments || dec.arguments.length === 0) throw new NeverEntryError();

    const paramObj = dec.arguments[0] as MetadataObject;

    if (paramObj.selector !== undefined) {
      if (typeof paramObj.selector !== "string") throw new NeverEntryError();
      result.selector = paramObj.selector;
    }

    return result;
  }

  private _getPipeDecoratorParam(dec: MetadataSymbolicCallExpression): { name?: string } {
    const result: { name?: string } = {};

    if (!dec.arguments || dec.arguments.length === 0) throw new NeverEntryError();

    const paramObj = dec.arguments[0] as MetadataObject;

    if (paramObj.name !== undefined) {
      if (typeof paramObj.name !== "string") throw new NeverEntryError();
      result.name = paramObj.name;
    }

    return result;
  }

  private _getComponentDecoratorParam(dec: MetadataSymbolicCallExpression): { selector?: string } {
    const result: { selector?: string } = {};

    if (!dec.arguments || dec.arguments.length === 0) throw new NeverEntryError();

    const paramObj = dec.arguments[0] as MetadataObject;

    if (paramObj.selector !== undefined) {
      if (typeof paramObj.selector !== "string") throw new NeverEntryError();
      result.selector = paramObj.selector;
    }

    return result;
  }

  private _getInjectableDecoratorParam(dec: MetadataSymbolicCallExpression): { providedIn?: string } {
    const result: { providedIn?: string } = {};

    if (dec.arguments && dec.arguments.length !== 0) {
      const paramObj = dec.arguments[0] as MetadataObject;

      if (paramObj.providedIn != null) {
        if (typeof paramObj.providedIn !== "string") throw new NeverEntryError();
        result.providedIn = paramObj.providedIn;
      }
    }

    return result;
  }

  private _getReferenceTargets(metadata: MetadataEntry | MetadataEntry[]): ({ lastModule?: string; lastName?: string; metadata: MetadataEntry })[] {
    if (isMetadataSymbolicReferenceExpression(metadata)) {
      if (isMetadataGlobalReferenceExpression(metadata)) {
        const subMetadata = this._metadataRoot.metadata[metadata.name];
        if (isMetadataSymbolicReferenceExpression(subMetadata)) {
          return this._getReferenceTargets(subMetadata);
        }
        if (subMetadata instanceof Array) {
          return this._getReferenceTargets(subMetadata);
        }
        else {
          return [{ lastName: metadata.name, metadata: subMetadata }];
        }
      }
      else if (isMetadataImportedSymbolReferenceExpression(metadata)) {
        return [{ lastModule: metadata.module, lastName: metadata.name, metadata }];
      }
      else {
        return [{ lastModule: metadata.module, metadata }];
      }
    }
    else if (metadata instanceof Array) {
      const result: ({ lastModule?: string; lastName?: string; metadata: MetadataEntry })[] = [];

      for (const metadataItem of metadata) {
        if (isMetadataSymbolicReferenceExpression(metadataItem)) {
          result.push(...this._getReferenceTargets(metadataItem));
        }
        else if (metadataItem instanceof Array) {
          result.push(...this._getReferenceTargets(metadataItem));
        }
        else {
          result.push({ metadata: metadataItem });
        }
      }

      return result;
    }
    else {
      return [{ metadata }];
    }
  }

  private _getProviderReferenceTargets(metadata: MetadataEntry | MetadataEntry[]): ({ lastModule?: string; lastName?: string; metadata: MetadataEntry })[] {
    const result: ({ lastModule?: string; lastName?: string; metadata: MetadataEntry })[] = [];

    const refTargets = this._getReferenceTargets(metadata);
    for (const refTarget of refTargets) {
      if (refTarget.metadata !== undefined && (refTarget.metadata as any).provide !== undefined) {
        result.push(...this._getProviderReferenceTargets((refTarget.metadata as any).provide));
      }
      else if (!StringUtil.isNullOrEmpty(refTarget.lastName)) {
        result.push(refTarget);
      }
      else if (isMetadataSymbolicCallExpression(refTarget.metadata)) {
        const subProvRefTargets = this._getProviderReferenceTargets(
          this._getProviderReferenceTargets(refTarget.metadata.expression).mapMany((item) => (item.metadata as any).value ?? [])
        );
        result.push(...subProvRefTargets);
      }
      else if (isMetadataSymbolicIfExpression(refTarget.metadata)) {
        result.push(...this._getProviderReferenceTargets([refTarget.metadata.thenExpression, refTarget.metadata.elseExpression]));
      }
      else {
        throw new NeverEntryError();
      }
    }

    return result;
  }

  private _getNgModuleDecoratorParam(dec: MetadataSymbolicCallExpression): { exports: IAotModuleImport[]; providers: IAotModuleImport[] } {
    const result: { exports: IAotModuleImport[]; providers: IAotModuleImport[] } = {
      exports: [],
      providers: []
    };

    if (!dec.arguments || dec.arguments.length === 0) throw new NeverEntryError();

    const paramObj = dec.arguments[0] as MetadataObject;
    if (paramObj.exports !== undefined) {
      if (!(paramObj.exports instanceof Array)) throw new NeverEntryError();

      for (const exp of paramObj.exports) {
        if (!isMetadataSymbolicReferenceExpression(exp)) throw new NeverEntryError();
        const expRefTargets = this._getReferenceTargets(exp);
        for (const expRefTarget of expRefTargets) {
          if (expRefTarget.lastName === undefined) throw new NeverEntryError();
          result.exports.push({ moduleName: expRefTarget.lastModule, name: expRefTarget.lastName });
        }
      }
    }

    if (paramObj.providers !== undefined) {
      const provRefTargets = this._getProviderReferenceTargets(paramObj.providers);
      for (const provRefTarget of provRefTargets) {
        if (provRefTarget.lastName === undefined) throw new NeverEntryError();
        result.providers.push({ moduleName: provRefTarget.lastModule, name: provRefTarget.lastName });
      }
    }

    return result;
  }

  private getNgModuleStaticProviders(metadata: ClassMetadata): IAotModuleImport[] {
    const result: IAotModuleImport[] = [];

    if (metadata.statics) {
      const provRefTargets = this._getProviderReferenceTargets(Object.values(metadata.statics).mapMany((item: any) => item.value?.providers ?? []));
      for (const provRefTarget of provRefTargets) {
        if (provRefTarget.lastName === undefined) throw new NeverEntryError();
        result.push({ moduleName: provRefTarget.lastModule, name: provRefTarget.lastName });
      }
    }

    return result;
  }
}


export interface IAotModuleDefMetadata {
  moduleName: string;
  exports: IAotModuleExport[];
  metadata: TAotNgMetadata[];
}

export interface IAotModuleExport {
  moduleName: string | undefined;
  name: string | undefined;
  as: string | undefined;
}

export type TAotNgMetadata =
  IAotNgModuleMetadata
  | IAotInjectableMetadata
  | IAotDirectiveMetadata
  | IAotPipeMetadata
  | IAotComponentMetadata;

export interface IAotNgModuleMetadata {
  type: "NgModule";
  className: string;
  exports: IAotModuleImport[];
  providers: IAotModuleImport[];
}

export interface IAotInjectableMetadata {
  type: "Injectable";
  className: string;
  providedIn?: string;
}

export interface IAotDirectiveMetadata {
  type: "Directive";
  className: string;
  selector?: string;
}

export interface IAotPipeMetadata {
  type: "Pipe";
  className: string;
  name?: string;
}

export interface IAotComponentMetadata {
  type: "Component";
  className: string;
  selector?: string;
}

export interface IAotModuleImport {
  moduleName: string | undefined;
  name: string;
}
