import { ISdPackageBuildResult } from "../commons";
import { NeverEntryError, ObjectUtil, StringUtil } from "@simplysm/sd-core-common";
import * as ts from "typescript";
import { FsUtil, PathUtil } from "@simplysm/sd-core-node";
import { NgCompiler } from "@angular/compiler-cli/src/ngtsc/core";
import * as path from "path";
import { JSDOM } from "jsdom";
import { SdCliUtils } from "../utils/SdCliUtils";
import * as os from "os";
import { SdIvyMetadataReader } from "./metadata/SdIvyMetadataReader";
import { SdMyMetadataReader } from "./metadata/SdMyMetadataReader";

export class SdCliNgModuleFilesGenerator {
  private readonly _fileCache = new Map<string, IFileCache>();

  private _compilerOptions?: ts.CompilerOptions;
  private _compilerHost?: ts.CompilerHost;
  private _moduleResolutionCache?: ts.ModuleResolutionCache;

  private readonly _sourceDirPath = path.resolve(this._rootDir, "src");
  private readonly _moduleDistDirPath = path.resolve(this._rootDir, "src/_modules");

  public constructor(private readonly _rootDir: string) {
  }

  public decacheFilePaths(filePaths: string[]): void {
    for (const filePath of filePaths) {
      this._fileCache.delete(PathUtil.posix(filePath));
    }
  }

  public reloadSourceFiles(dirtySourceFiles: ts.SourceFile[],
                           compilerOptions: ts.CompilerOptions,
                           compilerHost: ts.CompilerHost,
                           moduleResolutionCache: ts.ModuleResolutionCache,
                           ngCompiler: NgCompiler,
                           program: ts.Program): ISdPackageBuildResult[] {
    const result: ISdPackageBuildResult[] = [];

    this._compilerOptions = compilerOptions;
    this._compilerHost = compilerHost;
    this._moduleResolutionCache = moduleResolutionCache;

    for (const sourceFile of dirtySourceFiles) {
      const filePath = PathUtil.posix(sourceFile.fileName);
      this._fileCache.delete(filePath);

      const npmConfigFilePath = !FsUtil.isChildPath(filePath, this._sourceDirPath) ? SdCliUtils.findNpmConfigFilePathForSourceFile(filePath) : undefined;
      const npmConfig = !StringUtil.isNullOrEmpty(npmConfigFilePath) ? FsUtil.readJson(npmConfigFilePath) : undefined;

      const newFileCache: IFileCache = { sourceFile };

      try {
        // 내 소스코드

        // IMPORTS, IMPORT-EXPORTS
        ts.forEachChild(sourceFile, (node) => {
          if (!ts.isImportDeclaration(node) && !ts.isImportEqualsDeclaration(node) && !ts.isExportDeclaration(node)) return;

          let moduleName: string | undefined;
          if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
            if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
              moduleName = node.moduleSpecifier.text;
            }
          }
          else if (ts.isImportEqualsDeclaration(node)) {
            const reference = node.moduleReference;
            if (ts.isExternalModuleReference(reference)) {
              if (ts.isStringLiteral(reference.expression)) {
                moduleName = reference.expression.text;
              }
            }
          }
          if (StringUtil.isNullOrEmpty(moduleName)) return;

          const impFilePath = this._getResolvedFilePath(sourceFile.fileName, moduleName);
          if (StringUtil.isNullOrEmpty(impFilePath)) return;

          let targetNames: string[] | undefined;
          if (ts.isImportDeclaration(node)) {
            const importNamedBindings = node.importClause?.namedBindings;
            if (importNamedBindings) {
              if (ts.isNamedImports(importNamedBindings)) {
                targetNames = importNamedBindings.elements.map((item) => item.name.text);
              }
            }
          }
          else if (ts.isExportDeclaration(node)) {
            const exportNamedBindings = node.exportClause;
            if (exportNamedBindings && ts.isNamedExports(exportNamedBindings)) {
              targetNames = exportNamedBindings.elements.map((item) => item.name.text);
            }
          }

          if (targetNames) {
            newFileCache.importMap = newFileCache.importMap ?? new Map<string, string[]>();
            newFileCache.importMap.getOrCreate(impFilePath, []).push(...targetNames);

            if (ts.isExportDeclaration(node)) {
              newFileCache.importExportMap = newFileCache.importExportMap ?? new Map<string, string[]>();
              newFileCache.importExportMap.getOrCreate(impFilePath, []).push(...targetNames);
            }
          }
        });

        // EXPORTS
        ts.forEachChild(sourceFile, (node) => {
          if (!node.modifiers || !node.modifiers.some((item) => item.kind === ts.SyntaxKind.ExportKeyword)) return;
          if (StringUtil.isNullOrEmpty((node as any).name?.text)) return;

          newFileCache.exports = newFileCache.exports ?? [];
          newFileCache.exports.push((node as any).name.text);
        });

        // 내 소스코드
        if (filePath.endsWith(".ts") && !filePath.endsWith(".d.ts")) {
          new SdMyMetadataReader(sourceFile, program).getMetadatas();

          ts.forEachChild(sourceFile, (node) => {
            if (!ts.isClassDeclaration(node) || !node.name || !node.decorators) return;
            const className = node.name.text;

            for (const dec of node.decorators) {
              if (!ts.isCallExpression(dec.expression)) continue;
              if (!ts.isIdentifier(dec.expression.expression)) continue;

              // NgModule
              if (dec.expression.expression.text === "NgModule") {
                const ngModule: INgModuleDef = {
                  className,
                  exportClassNames: [],
                  providerClassNames: []
                };

                if (dec.expression.arguments.length === 0 || !ts.isObjectLiteralExpression(dec.expression.arguments[0])) {
                  throw new NeverEntryError();
                }

                const props = dec.expression.arguments[0].properties;
                for (const prop of props) {
                  if (!ts.isPropertyAssignment(prop)) continue;
                  if (!ts.isIdentifier(prop.name)) continue;

                  if (prop.name.text === "exports") {
                    if (ts.isArrayLiteralExpression(prop.initializer)) {
                      for (const el of prop.initializer.elements) {
                        if (ts.isIdentifier(el)) {
                          ngModule.exportClassNames.push(el.text);
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
                  if (prop.name.text === "providers") {
                    if (ts.isArrayLiteralExpression(prop.initializer)) {
                      for (const el of prop.initializer.elements) {
                        if (ts.isIdentifier(el)) {
                          ngModule.providerClassNames.push(el.text);
                        }
                        else if (ts.isObjectLiteralExpression(el)) {
                          for (const elProp of el.properties) {
                            if (!ts.isPropertyAssignment(elProp)) throw new NeverEntryError();
                            if (!ts.isIdentifier(elProp.name)) throw new NeverEntryError();

                            if (elProp.name.text === "provide") {
                              if (!ts.isIdentifier(elProp.initializer)) throw new NeverEntryError();
                              ngModule.providerClassNames.push(elProp.initializer.text);
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
                }

                for (const member of node.members) {
                  if (!ts.isMethodDeclaration(member)) continue;
                  if (!member.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.StaticKeyword)) continue;
                  if (!member.body) throw new NeverEntryError();

                  for (const statement of member.body.statements) {
                    if (ts.isReturnStatement(statement)) {
                      if (!statement.expression) throw new NeverEntryError();

                      if (ts.isObjectLiteralExpression(statement.expression)) {
                        for (const prop of statement.expression.properties) {
                          if (!ts.isPropertyAssignment(prop)) throw new NeverEntryError();
                          if (!ts.isIdentifier(prop.name)) continue;

                          if (prop.name.text === "providers") {
                            if (ts.isArrayLiteralExpression(prop.initializer)) {
                              for (const el of prop.initializer.elements) {
                                if (ts.isIdentifier(el)) {
                                  ngModule.providerClassNames.push(el.text);
                                }
                                else if (ts.isObjectLiteralExpression(el)) {
                                  for (const elProp of el.properties) {
                                    if (!ts.isPropertyAssignment(elProp)) throw new NeverEntryError();
                                    if (!ts.isIdentifier(elProp.name)) throw new NeverEntryError();

                                    if (elProp.name.text === "provide") {
                                      if (!ts.isIdentifier(elProp.initializer)) throw new NeverEntryError();
                                      ngModule.providerClassNames.push(elProp.initializer.text);
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
                        }
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

                newFileCache.ngModules = newFileCache.ngModules ?? [];
                newFileCache.ngModules.push(ngModule);
              }

              // Injectable
              if (dec.expression.expression.text === "Injectable") {
                const injectable: IInjectableDef = {
                  className,
                  providedIn: undefined
                };

                if (dec.expression.arguments.length !== 0) {
                  if (!ts.isObjectLiteralExpression(dec.expression.arguments[0])) {
                    throw new NeverEntryError();
                  }

                  const props = dec.expression.arguments[0].properties;
                  for (const prop of props) {
                    if (!ts.isPropertyAssignment(prop)) continue;
                    if (!ts.isIdentifier(prop.name)) continue;

                    if (prop.name.text === "providedIn") {
                      injectable.providedIn = this._getStringValue(prop.initializer);
                    }
                  }
                }

                newFileCache.injectables = newFileCache.injectables ?? [];
                newFileCache.injectables.push(injectable);
              }

              // Directive
              if (dec.expression.expression.text === "Directive") {
                const directive: IDirectiveDef = {
                  className,
                  selector: undefined
                };

                if (dec.expression.arguments.length === 0 || !ts.isObjectLiteralExpression(dec.expression.arguments[0])) {
                  throw new NeverEntryError();
                }

                const props = dec.expression.arguments[0].properties;
                for (const prop of props) {
                  if (!ts.isPropertyAssignment(prop)) continue;
                  if (!ts.isIdentifier(prop.name)) continue;

                  if (prop.name.text === "selector") {
                    directive.selector = this._getStringValue(prop.initializer);
                  }
                }

                newFileCache.directives = newFileCache.directives ?? [];
                newFileCache.directives.push(directive);
              }

              // Pipe
              if (dec.expression.expression.text === "Pipe") {
                const pipe: IPipeDef = {
                  className,
                  name: undefined
                };

                if (dec.expression.arguments.length === 0 || !ts.isObjectLiteralExpression(dec.expression.arguments[0])) {
                  throw new NeverEntryError();
                }

                const props = dec.expression.arguments[0].properties;
                for (const prop of props) {
                  if (!ts.isPropertyAssignment(prop)) continue;
                  if (!ts.isIdentifier(prop.name)) continue;

                  if (prop.name.text === "name") {
                    pipe.name = this._getStringValue(prop.initializer);
                  }
                }

                newFileCache.pipes = newFileCache.pipes ?? [];
                newFileCache.pipes.push(pipe);
              }

              // Component
              if (dec.expression.expression.text === "Component") {
                const component: IComponentDef = {
                  className,
                  selector: undefined,
                  template: undefined
                };

                if (dec.expression.arguments.length === 0 || !ts.isObjectLiteralExpression(dec.expression.arguments[0])) {
                  throw new NeverEntryError();
                }

                const props = dec.expression.arguments[0].properties;
                for (const prop of props) {
                  if (!ts.isPropertyAssignment(prop)) continue;
                  if (!ts.isIdentifier(prop.name)) continue;

                  if (prop.name.text === "selector") {
                    component.selector = this._getStringValue(prop.initializer);
                  }
                  if (prop.name.text === "template") {
                    component.template = this._getStringValue(prop.initializer);
                  }
                }

                newFileCache.components = newFileCache.components ?? [];
                newFileCache.components.push(component);
              }
            }
          });
        }

        // AOT 라이브러리
        if (filePath.endsWith(".d.ts")) {
          new SdIvyMetadataReader(sourceFile, program).getMetadatas();

          // from METADATA
          const metadataFilePath = filePath.replace(/\.d\.ts$/, ".metadata.json");
          if (FsUtil.exists(metadataFilePath)) {
            const metadataRoot = FsUtil.readJson(metadataFilePath);

            if (!StringUtil.isNullOrEmpty(metadataRoot.importAs)) {
              newFileCache.moduleName = metadataRoot.importAs;
            }
            else {
              newFileCache.moduleName = npmConfig?.name;
            }

            for (const metadataName of Object.keys(metadataRoot.metadata)) {
              const metadata = metadataRoot.metadata[metadataName];
              if (metadata.__symbolic !== "class" || metadata.decorators === undefined) continue;
              const className = metadataName;

              for (const dec of metadata.decorators) {
                if (dec.__symbolic !== "call") throw new NeverEntryError();
                if (dec.expression.__symbolic !== "reference") throw new NeverEntryError();
                const decExp = this._getFromReferenceMetadata(metadataRoot, dec.expression);

                if (decExp.name === "NgModule") {
                  const ngModule: INgModuleDef = {
                    className,
                    exportClassNames: [],
                    providerClassNames: []
                  };

                  if (dec.arguments === undefined || dec.arguments.length === 0) throw new NeverEntryError();

                  // EXPORTS
                  if (dec.arguments[0].exports !== undefined) {
                    if (!(dec.arguments[0].exports instanceof Array)) throw new NeverEntryError();

                    for (const exp of dec.arguments[0].exports) {
                      if (exp.__symbolic === "reference") {
                        const argExp = this._getFromReferenceMetadata(metadataRoot, exp);
                        if (argExp instanceof Array) {
                          for (const argExpItem of argExp) {
                            if (argExpItem.name === undefined) throw new NeverEntryError();
                            ngModule.exportClassNames.push(argExpItem.name);

                            const moduleFilePath = argExpItem.module !== undefined ? this._getResolvedFilePath(filePath, argExpItem.module) : filePath;
                            if (moduleFilePath === undefined) throw new NeverEntryError();
                            newFileCache.importMap = newFileCache.importMap ?? new Map<string, string[]>();
                            const importMapValues = newFileCache.importMap.getOrCreate(moduleFilePath, []);
                            importMapValues.push(argExpItem.name);
                          }
                        }
                        else {
                          if (argExp.name === undefined) throw new NeverEntryError();
                          ngModule.exportClassNames.push(argExp.name);

                          const moduleFilePath = argExp.module !== undefined ? this._getResolvedFilePath(filePath, argExp.module) : filePath;
                          if (moduleFilePath === undefined) throw new NeverEntryError();
                          newFileCache.importMap = newFileCache.importMap ?? new Map<string, string[]>();
                          const importMapValues = newFileCache.importMap.getOrCreate(moduleFilePath, []);
                          importMapValues.push(argExp.name);
                        }
                      }
                      else {
                        throw new NeverEntryError();
                      }
                    }
                  }

                  // PROVIDERS
                  if (dec.arguments[0].providers !== undefined) {
                    const providerInfos = this._getProviderInfosFromMetadata(metadataRoot, dec.arguments[0].providers);
                    for (const providerInfo of providerInfos) {
                      ngModule.providerClassNames.push(providerInfo.name);

                      const moduleFilePath = providerInfo.module !== undefined ? this._getResolvedFilePath(filePath, providerInfo.module) : filePath;
                      if (moduleFilePath === undefined) throw new NeverEntryError();
                      newFileCache.importMap = newFileCache.importMap ?? new Map<string, string[]>();
                      const importMapValues = newFileCache.importMap.getOrCreate(moduleFilePath, []);
                      importMapValues.push(providerInfo.name);
                    }
                  }

                  // static PROVIDERS
                  if (metadata.statics !== undefined) {
                    const provs = Object.values(metadata.statics).mapMany((item: any) => item.value?.providers ?? []);
                    const providerInfos = this._getProviderInfosFromMetadata(metadataRoot, provs);
                    for (const providerInfo of providerInfos) {
                      ngModule.providerClassNames.push(providerInfo.name);

                      const moduleFilePath = providerInfo.module !== undefined ? this._getResolvedFilePath(filePath, providerInfo.module) : filePath;
                      if (moduleFilePath === undefined) throw new NeverEntryError();
                      newFileCache.importMap = newFileCache.importMap ?? new Map<string, string[]>();
                      const importMapValues = newFileCache.importMap.getOrCreate(moduleFilePath, []);
                      importMapValues.push(providerInfo.name);
                    }
                  }

                  newFileCache.ngModules = newFileCache.ngModules ?? [];
                  newFileCache.ngModules.push(ngModule);
                }

                if (dec.expression.name === "Injectable") {
                  const injectable: IInjectableDef = {
                    className,
                    providedIn: undefined
                  };

                  if (dec.arguments !== undefined && dec.arguments.length !== 0) {
                    // providedIn
                    if (dec.arguments[0].providedIn !== undefined) {
                      if (typeof dec.arguments[0].providedIn !== "string") throw new NeverEntryError();
                      injectable.providedIn = dec.arguments[0].providedIn;
                    }
                  }

                  newFileCache.injectables = newFileCache.injectables ?? [];
                  newFileCache.injectables.push(injectable);
                }

                if (dec.expression.name === "Directive") {
                  const directive: IDirectiveDef = {
                    className,
                    selector: undefined
                  };

                  if (dec.arguments === undefined || dec.arguments.length === 0) throw new NeverEntryError();

                  // selector
                  if (dec.arguments[0].selector !== undefined) {
                    if (typeof dec.arguments[0].selector !== "string") throw new NeverEntryError();
                    directive.selector = dec.arguments[0].selector;
                  }

                  newFileCache.directives = newFileCache.directives ?? [];
                  newFileCache.directives.push(directive);
                }

                if (dec.expression.name === "Pipe") {
                  const pipe: IPipeDef = {
                    className,
                    name: undefined
                  };

                  if (dec.arguments === undefined || dec.arguments.length === 0) throw new NeverEntryError();

                  // selector
                  if (dec.arguments[0].name !== undefined) {
                    if (typeof dec.arguments[0].name !== "string") throw new NeverEntryError();
                    pipe.name = dec.arguments[0].name;
                  }

                  newFileCache.pipes = newFileCache.pipes ?? [];
                  newFileCache.pipes.push(pipe);
                }

                if (dec.expression.name === "Component") {
                  const component: IComponentDef = {
                    className,
                    selector: undefined,
                    template: undefined
                  };

                  if (dec.arguments === undefined || dec.arguments.length === 0) throw new NeverEntryError();

                  // selector
                  if (dec.arguments[0].selector !== undefined) {
                    if (typeof dec.arguments[0].selector !== "string") throw new NeverEntryError();
                    component.selector = dec.arguments[0].selector;
                  }
                  // template
                  if (dec.arguments[0].template !== undefined) {
                    if (typeof dec.arguments[0].template !== "string") throw new NeverEntryError();
                    component.template = dec.arguments[0].template;
                  }

                  newFileCache.directives = newFileCache.directives ?? [];
                  newFileCache.directives.push(component);
                }
              }
            }
          }

          // from IVY
          else {
            // TODO
            /*newFileCache.moduleName = npmConfig?.name;

            ts.forEachChild(sourceFile, (node) => {
              if (!isNamedClassDeclaration(node)) return;
              const className = node.name.text;

              const metaReader: MetadataReader = ngCompiler["ensureAnalyzed"]().metaReader;

              const ngModuleMeta = metaReader.getNgModuleMetadata(new Reference(node));
              if (ngModuleMeta) {
                newFileCache.ngModules = newFileCache.ngModules ?? [];
                newFileCache.ngModules.push({
                  className,
                  exportClassNames: ngModuleMeta.exports.map((item) => item.node.name.text),
                  providerClassNames: []
                });
              }

              const pipeMeta = metaReader.getPipeMetadata(new Reference(node));
              if (pipeMeta) {
                newFileCache.pipes = newFileCache.pipes ?? [];
                newFileCache.pipes.push({
                  className,
                  name: pipeMeta.name
                });
              }

              const directiveMeta = metaReader.getDirectiveMetadata(new Reference(node));
              if (directiveMeta) {
                if (directiveMeta.isComponent) {
                  newFileCache.components = newFileCache.components ?? [];
                  newFileCache.components.push({
                    className,
                    selector: directiveMeta.selector ?? undefined,
                    template: undefined
                  });
                }
                else {
                  newFileCache.directives = newFileCache.directives ?? [];
                  newFileCache.directives.push({
                    className,
                    selector: directiveMeta.selector ?? undefined
                  });
                }
              }
            });*/
          }
        }
      }
      catch (err) {
        result.push({
          filePath,
          severity: "error",
          message: `${path.resolve(filePath)}(0, 0): error ${err.stack ?? err.message}`
        });
        // TODO
        throw err;
      }

      this._fileCache.set(filePath, newFileCache);
    }

    return result;
  }

  public generate(): ISdPackageBuildResult[] {
    const moduleInfoMap = new Map<string, IGenNgModuleInfo>();

    for (const filePath of Array.from(this._fileCache.keys())) {
      if (!filePath.endsWith(".ts") || filePath.endsWith(".d.ts")) continue;

      const fileCache = this._fileCache.get(filePath)!;

      if (fileCache.injectables) {
        for (const injectable of fileCache.injectables) {
          if (!injectable.className.endsWith("Provider")) continue;

          if (injectable.providedIn === "root") continue;

          const newModuleInfo: IGenNgModuleInfo = {
            moduleImportMap: new Map<string, string[]>(),
            imports: [],
            exports: [],
            providers: [],
            className: injectable.className + "Module"
          };

          newModuleInfo.providers.push(injectable.className);

          // const moduleImportName = this._getGenNgModuleModuleImportName(filePath);
          const moduleImport = newModuleInfo.moduleImportMap.getOrCreate(filePath, []);
          moduleImport.push(injectable.className);
          moduleInfoMap.set(PathUtil.posix(this._getGenNgModuleDistPath(filePath), injectable.className + "Module.ts"), newModuleInfo);
        }
      }

      if (fileCache.directives) {
        for (const directive of fileCache.directives) {
          // 지정된 값으로 끝나지 않는것은 제외
          if (!directive.className.endsWith("Directive")) continue;

          const newModuleInfo: IGenNgModuleInfo = {
            moduleImportMap: new Map<string, string[]>(),
            imports: [],
            exports: [],
            providers: [],
            className: directive.className + "Module"
          };

          newModuleInfo.exports.push(directive.className);

          // const moduleImportName = this._getGenNgModuleModuleImportName(filePath);
          const moduleImport = newModuleInfo.moduleImportMap.getOrCreate(filePath, []);
          moduleImport.push(directive.className);
          moduleInfoMap.set(PathUtil.posix(this._getGenNgModuleDistPath(filePath), directive.className + "Module.ts"), newModuleInfo);
        }
      }

      if (fileCache.pipes) {
        for (const pipe of fileCache.pipes) {
          // 지정된 값으로 끝나지 않는것은 제외
          if (!pipe.className.endsWith("Pipe")) continue;

          const newModuleInfo: IGenNgModuleInfo = {
            moduleImportMap: new Map<string, string[]>(),
            imports: [],
            exports: [],
            providers: [],
            className: pipe.className + "Module"
          };

          newModuleInfo.exports.push(pipe.className);

          // const moduleImportName = this._getGenNgModuleModuleImportName(filePath);
          const moduleImport = newModuleInfo.moduleImportMap.getOrCreate(filePath, []);
          moduleImport.push(pipe.className);
          moduleInfoMap.set(PathUtil.posix(this._getGenNgModuleDistPath(filePath), pipe.className + "Module.ts"), newModuleInfo);
        }
      }

      if (fileCache.components) {
        for (const component of fileCache.components) {
          if (
            !component.className.endsWith("Page")
            && !component.className.endsWith("Component")
            && !component.className.endsWith("Modal")
            && !component.className.endsWith("Control")
            && !component.className.endsWith("PrintTemplate")
            && !component.className.endsWith("Toast")
          ) continue;

          const newModuleInfo: IGenNgModuleInfo = {
            moduleImportMap: new Map<string, string[]>(),
            imports: [],
            exports: [],
            providers: [],
            className: component.className + "Module"
          };

          newModuleInfo.exports.push(component.className);

          // const moduleImportName = this._getGenNgModuleModuleImportName(filePath);
          const moduleImport = newModuleInfo.moduleImportMap.getOrCreate(filePath, []);
          moduleImport.push(component.className);

          const importTargets: { filePath: string; targetName: string }[] = [];

          // module import/export된 provider 찾기
          if (fileCache.importMap) {
            for (const impFilePath of fileCache.importMap.keys()) {
              for (const impTargetName of fileCache.importMap.get(impFilePath)!) {
                importTargets.push({ filePath: impFilePath, targetName: impTargetName });
              }
            }
          }
          if (fileCache.importExportMap) {
            for (const expFilePath of fileCache.importExportMap.keys()) {
              for (const expTargetName of fileCache.importExportMap.get(expFilePath)!) {
                importTargets.push({ filePath: expFilePath, targetName: expTargetName });
              }
            }
          }

          // template으로 component/directive 찾기
          if (!StringUtil.isNullOrEmpty(component.template)) {
            const selectorInfos = this._getAllSelectorInfos();

            const templateDOM = new JSDOM(component.template);

            for (const selectorInfo of selectorInfos) {
              if (
                templateDOM.window.document.querySelector([
                  selectorInfo.selector,
                  selectorInfo.selector.replace(/\[/g, "[\\[").replace(/]/g, "\\]]"),
                  selectorInfo.selector.replace(/\[/g, "[\\(").replace(/]/g, "\\)]")
                ].join(", ")) != null
              ) {
                importTargets.push({ filePath: selectorInfo.filePath, targetName: selectorInfo.className });
              }
            }
          }

          // template으로 pipe 찾기
          if (!StringUtil.isNullOrEmpty(component.template)) {
            const pipeInfos = this._getAllPipeInfos();

            for (const pipeInfo of pipeInfos) {
              if (new RegExp("| *" + pipeInfo.name + "[^\\w]").test(component.template)) {
                importTargets.push({ filePath: pipeInfo.filePath, targetName: pipeInfo.className });
              }
            }
          }

          // provider/component/directive/pipe에 따라 NgModule 찾아 import등록
          const ngModuleExportInfos = this._getAllNgModuleExportInfos();
          /*try {
            ngModuleExportInfos.toMap((item) => item.exportFilePath + "#" + item.exportClassName);
          }
          catch (err) {
            console.log(ngModuleExportInfos.filter((item) => item.exportClassName.includes("SdComboboxItemControl")));
            throw err;
          }*/

          const ngModuleExportMap = ngModuleExportInfos.toMap((item) => item.exportFilePath + "#" + item.exportClassName);

          for (const importTarget of importTargets) {
            const ngModule = ngModuleExportMap.get(importTarget.filePath + "#" + importTarget.targetName);
            if (ngModule) {
              newModuleInfo.imports.push(ngModule.className);
              const moduleImportMapValues = newModuleInfo.moduleImportMap.getOrCreate(ngModule.filePath, []);
              moduleImportMapValues.push(ngModule.className);
            }
          }

          moduleInfoMap.set(PathUtil.posix(this._getGenNgModuleDistPath(filePath), component.className + "Module.ts"), {
            moduleImportMap: Array.from(newModuleInfo.moduleImportMap.entries())
              .toMap((item) => item[0], (item) => item[1].distinct()),
            className: newModuleInfo.className,
            imports: newModuleInfo.imports.distinct(),
            exports: newModuleInfo.exports.distinct(),
            providers: newModuleInfo.providers.distinct()
          });
        }
      }
    }

    let changed = false;
    for (const moduleInfoMapEntry of moduleInfoMap.entries()) {
      const moduleFilePath = moduleInfoMapEntry[0];
      const moduleInfo = moduleInfoMapEntry[1];

      const newFileCache: IFileCache = {
        importMap: moduleInfo.moduleImportMap,
        exports: [moduleInfo.className],
        ngModules: [{
          className: moduleInfo.className,
          exportClassNames: moduleInfo.exports,
          providerClassNames: moduleInfo.providers
        }]
      };

      const prevFileCache = this._fileCache.getOrCreate(moduleFilePath, {});
      if (
        !ObjectUtil.equal(prevFileCache.importMap, newFileCache.importMap, { ignoreArrayIndex: true })
        || !ObjectUtil.equal(prevFileCache.exports, newFileCache.exports, { ignoreArrayIndex: true })
        || !ObjectUtil.equal(prevFileCache.ngModules, newFileCache.ngModules, { ignoreArrayIndex: true })
      ) {
        this._fileCache.set(moduleFilePath, newFileCache);
        changed = true;
      }
    }

    if (changed) {
      this.generate();
    }
    else {
      const fnMerge = (): boolean => {
        const moduleFilePaths = Array.from(moduleInfoMap.keys()).orderBy().orderBy((item) => item.length);
        for (const moduleFilePath of moduleFilePaths) {
          const circularFilePaths = this._getModuleInfoMapExportCircular(moduleInfoMap, [moduleFilePath]);
          if (circularFilePaths.length === 0) continue;

          for (const circularFilePath of circularFilePaths) {
            const thisModuleInfo = moduleInfoMap.get(moduleFilePath)!;
            const circularModuleInfo = moduleInfoMap.get(circularFilePath)!;

            const mergedModuleInfo = ObjectUtil.merge(circularModuleInfo, thisModuleInfo, { arrayProcess: "concat" });
            mergedModuleInfo.moduleImportMap.delete(moduleFilePath);
            mergedModuleInfo.moduleImportMap.delete(circularFilePath);
            mergedModuleInfo.imports.remove(thisModuleInfo.className);
            mergedModuleInfo.imports.remove(circularModuleInfo.className);

            moduleInfoMap.set(moduleFilePath, mergedModuleInfo);
            moduleInfoMap.delete(circularFilePath);
            this._fileCache.delete(circularFilePath);

            for (const otherModuleInfoFilePath of moduleInfoMap.keys()) {
              const otherModuleInfo = moduleInfoMap.get(otherModuleInfoFilePath)!;
              if (otherModuleInfo.moduleImportMap.has(circularFilePath)) {
                otherModuleInfo.moduleImportMap.set(moduleFilePath, [
                  ...otherModuleInfo.moduleImportMap.get(moduleFilePath) ?? [],
                  thisModuleInfo.className
                ].distinct());
                otherModuleInfo.moduleImportMap.delete(circularFilePath);
                otherModuleInfo.imports.remove(circularModuleInfo.className);
              }
            }
          }

          return true;
        }
        return false;
      };
      while (fnMerge()) {
      }
    }


    for (const distFilePath of moduleInfoMap.keys()) {
      const moduleInfo = moduleInfoMap.get(distFilePath)!;

      const moduleImportTexts: string[] = [];
      for (const moduleImportFilePath of moduleInfo.moduleImportMap.keys()) {
        const moduleImportInfo = moduleInfo.moduleImportMap.get(moduleImportFilePath)!;

        const moduleImportRelativePath = this._getGenNgModuleModuleImportName(moduleImportFilePath);
        moduleImportTexts.push(`import { ${moduleImportInfo.join(", ")} } from "${moduleImportRelativePath}";`);
      }


      FsUtil.writeFile(distFilePath, `
import { NgModule } from "@angular/core";
${moduleImportTexts.join(os.EOL)}

@NgModule({
  imports: [${moduleInfo.imports.join(", ")}],
  declarations: [${moduleInfo.exports.join(", ")}],
  exports: [${moduleInfo.exports.join(", ")}],
  providers: [${moduleInfo.providers.join(", ")}]
})
export class ${moduleInfo.className} {
}`.split("\n").map((item) => item.trimEnd()).join(os.EOL).trim());
    }

    return [];
  }

  private _getModuleInfoMapExportCircular(moduleInfoMap: Map<string, IGenNgModuleInfo>, arr: string[]): string[] {
    if (moduleInfoMap.has(arr.last()!)) {
      const moduleInfo = moduleInfoMap.get(arr.last()!)!;

      const result: string[] = [];
      for (const moduleImportFilePath of moduleInfo.moduleImportMap.keys()) {
        if (arr.includes(moduleImportFilePath)) {
          if (arr[0] === moduleImportFilePath) {
            result.push(...arr.slice(1));
          }
        }
        else {
          result.push(...this._getModuleInfoMapExportCircular(moduleInfoMap, arr.concat([moduleImportFilePath])));
        }
      }
      return result.distinct();
    }
    else {
      return [];
    }
  }

  private _getAllNgModuleExportInfos(): { moduleName: string | undefined; filePath: string; className: string; exportFilePath: string; exportClassName: string }[] {
    const result: { moduleName: string | undefined; filePath: string; className: string; exportFilePath: string; exportClassName: string }[] = [];

    for (const filePath of this._fileCache.keys()) {
      const fileCache = this._fileCache.get(filePath)!;
      if (fileCache.ngModules) {
        for (const ngModule of fileCache.ngModules) {
          for (const exportClassName of ngModule.exportClassNames) {
            if (fileCache.importMap) {
              if (fileCache.exports?.includes(exportClassName)) {
                result.push({
                  moduleName: fileCache.moduleName,
                  filePath,
                  className: ngModule.className,
                  exportFilePath: filePath,
                  exportClassName
                });
              }
              else {
                const targetFilePath = Array.from(fileCache.importMap.entries()).single((item) => item[1].includes(exportClassName))?.[0];
                if (!StringUtil.isNullOrEmpty(targetFilePath)) {
                  result.push({
                    moduleName: fileCache.moduleName,
                    filePath,
                    className: ngModule.className,
                    exportFilePath: targetFilePath,
                    exportClassName
                  });
                }
              }
            }
          }
        }
      }
    }

    return result.distinct();
  }

  private _getAllSelectorInfos(): { selector: string; className: string; filePath: string }[] {
    const result: { selector: string; className: string; filePath: string }[] = [];

    for (const filePath of this._fileCache.keys()) {
      const fileCache = this._fileCache.get(filePath)!;
      if (fileCache.components) {
        for (const component of fileCache.components) {
          if (StringUtil.isNullOrEmpty(component.selector)) continue;

          result.push(({
            selector: component.selector,
            className: component.className,
            filePath
          }));
        }
      }
      if (fileCache.directives) {
        for (const directive of fileCache.directives) {
          if (StringUtil.isNullOrEmpty(directive.selector)) continue;

          result.push(({
            selector: directive.selector,
            className: directive.className,
            filePath
          }));
        }
      }
    }
    return result;
  }

  private _getAllPipeInfos(): { name: string; className: string; filePath: string }[] {
    const result: { name: string; className: string; filePath: string }[] = [];
    for (const filePath of this._fileCache.keys()) {
      const fileCache = this._fileCache.get(filePath)!;

      if (fileCache.pipes) {
        for (const pipe of fileCache.pipes) {
          if (StringUtil.isNullOrEmpty(pipe.name)) continue;

          result.push(({
            name: pipe.name,
            className: pipe.className,
            filePath
          }));
        }
      }
    }
    return result;
  }

  private _getGenNgModuleModuleImportName(filePath: string): string {
    const presetModuleName = this._fileCache.get(filePath)?.moduleName;
    if (!StringUtil.isNullOrEmpty(presetModuleName)) return presetModuleName;

    const distDirPath = this._getGenNgModuleDistPath(filePath);
    const relativeFilePath = path.relative(distDirPath, filePath);
    return (relativeFilePath.startsWith(".") ? relativeFilePath : "./" + relativeFilePath)
      .replace(/\.ts$/, "")
      .replace(/\\/g, "/");
  }

  private _getGenNgModuleDistPath(filePath: string): string {
    return path.resolve(this._moduleDistDirPath, path.relative(this._sourceDirPath, path.dirname(filePath)));
  }

  private _getResolvedFilePath(sourceFilePath: string, moduleName: string): string | undefined {
    const resolvedModule = ts.resolveModuleName(
      moduleName,
      sourceFilePath,
      this._compilerOptions!,
      this._compilerHost!,
      this._moduleResolutionCache
    ).resolvedModule;

    if (resolvedModule) {
      return PathUtil.posix(resolvedModule.resolvedFileName);
    }
    return undefined;
  }

  private _getStringValue(exp: ts.Expression): string | undefined {
    if (ts.isStringLiteral(exp) || ts.isNoSubstitutionTemplateLiteral(exp)) {
      return exp.text;
    }
    else if (exp.kind === ts.SyntaxKind.NullKeyword) {
      return undefined;
    }
    else {
      throw new NeverEntryError();
    }
  }

  private _getProviderInfosFromMetadata(metadataRoot: any, provs: any): { name: string; module?: string }[] {
    if (provs.__symbolic === "reference") {
      const parsedProvs = this._getFromReferenceMetadata(metadataRoot, provs);
      return this._getProviderInfosFromMetadata(metadataRoot, parsedProvs);
    }
    else if (provs instanceof Array) {
      if (provs.some((item) => item.__symbolic === "reference")) {
        const parsedProvs = this._getFromReferenceMetadata(metadataRoot, provs);
        return this._getProviderInfosFromMetadata(metadataRoot, parsedProvs);
      }
      else {
        const combinedArgProv = this._combineArray(provs);

        const result: { name: string; module?: string }[] = [];
        for (const argProvItem of combinedArgProv) {
          if (argProvItem.provide !== undefined) {
            if (argProvItem.provide.__symbolic === "reference") {
              const argProvItemProv = this._getFromReferenceMetadata(metadataRoot, argProvItem.provide);
              if (argProvItemProv.name === undefined) throw new NeverEntryError();
              result.push({ name: argProvItemProv.name, module: argProvItemProv.module });
            }
            else {
              throw new NeverEntryError();
            }
          }
          else if (argProvItem.__symbolic === "call") {
            if (argProvItem.expression._symbolic !== "reference") {
              const callExp = this._getFromReferenceMetadata(metadataRoot, argProvItem.expression);
              result.push(...this._getProviderInfosFromMetadata(metadataRoot, callExp.value));
            }
            else {
              throw new NeverEntryError();
            }
          }
          else if (argProvItem.__symbolic === "reference") {
            const argProvItemTarget = this._getFromReferenceMetadata(metadataRoot, argProvItem);
            if (argProvItemTarget.name === undefined) throw new NeverEntryError();
            result.push({ name: argProvItemTarget.name, module: argProvItemTarget.module });
          }
          else if (argProvItem.__symbolic === "class") {
            if (argProvItem.name === undefined) throw new NeverEntryError();
            result.push({ name: argProvItem.name, module: argProvItem.module });
          }
          else if (argProvItem.__symbolic === "if") {
            for (const exp of [argProvItem.thenExpression, argProvItem.elseExpression]) {
              if (exp instanceof Array && exp.length === 0) {
              }
              else if (exp.provide.__symbolic === "reference") {
                const expProv = this._getFromReferenceMetadata(metadataRoot, exp.provide);
                if (expProv.name === undefined) throw new NeverEntryError();
                result.push({ name: expProv.name, module: expProv.module });
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
        return result;
      }
    }
    else {
      throw new NeverEntryError();
    }
  }

  private _getFromReferenceMetadata(metadataRoot: any, obj: any): any {
    if (obj instanceof Array) {
      return obj.map((item) => this._getFromReferenceMetadata(metadataRoot, item));
    }
    else if (obj.__symbolic === "reference") {
      if (obj.module !== undefined) {
        return obj;
      }
      else {
        if (metadataRoot.metadata[obj.name] instanceof Array) {
          return metadataRoot.metadata[obj.name].map((item: any) => this._getFromReferenceMetadata(metadataRoot, item));
        }
        else {
          return this._getFromReferenceMetadata(metadataRoot, {
            name: obj.name,
            ...metadataRoot.metadata[obj.name]
          });
        }
      }
    }
    else {
      return obj;
    }
  }

  private _combineArray(arr: any[]): any[] {
    const result = [];
    for (const arrItem of arr) {
      if (arrItem instanceof Array) {
        result.push(...this._combineArray(arrItem));
      }
      else {
        result.push(arrItem);
      }
    }
    return result;
  }
}

interface IFileCache {
  sourceFile?: ts.SourceFile;
  moduleName?: string;
  importMap?: Map<string, string[]>;
  importExportMap?: Map<string, string[]>;
  exports?: string[];
  ngModules?: INgModuleDef[];
  injectables?: IInjectableDef[];
  directives?: IDirectiveDef[];
  pipes?: IPipeDef[];
  components?: IComponentDef[];
}

interface INgModuleDef {
  className: string;
  exportClassNames: string[];
  providerClassNames: string[];
}

interface IInjectableDef {
  className: string;
  providedIn: string | undefined;
}

interface IDirectiveDef {
  className: string;
  selector: string | undefined;
}

interface IPipeDef {
  className: string;
  name: string | undefined;
}

interface IComponentDef {
  className: string;
  selector: string | undefined;
  template: string | undefined;
}

interface IGenNgModuleInfo {
  moduleImportMap: Map<string, string[]>;
  imports: string[];
  exports: string[];
  providers: string[];
  className: string;
}
