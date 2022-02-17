import { FsUtil, Logger, LoggerSeverity, PathUtil } from "@simplysm/sd-core-node";
import babelParser from "@babel/parser";
import path from "path";
import { NeverEntryError, StringUtil } from "@simplysm/sd-core-common";
import {
  ClassDeclarationMetadata,
  INpmConfig,
  SdCliBabelMetadata,
  SdCliNpmConfigUtil,
  TDeclarationMetadata
} from "@simplysm/sd-cli";

Logger.setConfig({
  console: {
    level: LoggerSeverity.debug
  }
});

function getAllDepPaths(packagePath: string): string[] {
  const loadedModuleNames: string[] = [];
  const results: string[] = [];

  const fn = (currPath: string): void => {
    const npmConfig = FsUtil.readJson(path.resolve(currPath, "package.json")) as INpmConfig;

    const deps = SdCliNpmConfigUtil.getDependencies(npmConfig);

    for (const moduleName of deps.defaults) {
      if (loadedModuleNames.includes(moduleName)) continue;
      loadedModuleNames.push(moduleName);

      const modulePath = FsUtil.findAllParentChildDirPaths("node_modules/" + moduleName, currPath, process.cwd()).first();
      if (StringUtil.isNullOrEmpty(modulePath)) {
        continue;
      }

      results.push(modulePath);

      fn(modulePath);
    }
  };

  fn(packagePath);

  return results;
}

function getNgDepPaths(allDepPaths: string[]): string[] {
  const results: string[] = [];

  for (const depPath of allDepPaths) {
    const npmConfig = FsUtil.readJson(path.resolve(depPath, "package.json")) as INpmConfig;
    const defaultDeps = SdCliNpmConfigUtil.getDependencies(npmConfig).defaults;
    if (defaultDeps.includes("@angular/core")) {
      results.push(depPath);
    }
  }

  return results;
}

function getExportRecord(ngDepPaths: string[]): Record<string, string | undefined> {
  const exportRecord: Record<string, string | undefined> = {};
  for (const ngDepPath of ngDepPaths) {
    const npmConfig = FsUtil.readJson(path.resolve(ngDepPath, "package.json")) as INpmConfig;
    exportRecord[npmConfig.name] = path.resolve(ngDepPath, npmConfig["es2015"] ?? npmConfig["browser"] ?? npmConfig["module"] ?? npmConfig["main"]);

    if (npmConfig.exports) {
      const exportKeys = Object.keys(npmConfig.exports);
      for (const exportKey of exportKeys) {
        const exportPath = path.resolve(
          ngDepPath,
          npmConfig.exports[exportKey]["es2015"] ??
          npmConfig.exports[exportKey]["browser"] ??
          npmConfig.exports[exportKey]["module"] ??
          npmConfig.exports[exportKey]["main"] ??
          npmConfig.exports[exportKey]["default"]
        );
        const exportResult = getGlobExportResult(PathUtil.posix(npmConfig.name, exportKey), exportPath);
        for (const exportResultItem of exportResult) {
          if (
            exportResultItem.target.endsWith(".js") ||
            exportResultItem.target.endsWith(".mjs") ||
            exportResultItem.target.endsWith(".cjs")
          ) {
            exportRecord[exportResultItem.name] = exportResultItem.target;
          }
        }
      }
    }
  }

  return exportRecord;
}

function getGlobExportResult(globName: string, globTarget: string): { name: string; target: string }[] {
  if (globName.includes("*") && globTarget.includes("*")) {
    const result: { name: string; target: string }[] = [];

    const regexpText = globTarget.replace(/[\\/.*]/g, (item) => (
      item === "/" || item === "\\" ? "[\\\\/]"
        : item === "." ? "\\."
          : item === "*" ? "(.*)"
            : item
    ));

    const targets = FsUtil.glob(globTarget);
    for (const target of targets) {
      const targetNameMatch = new RegExp(regexpText).exec(target);
      if (!targetNameMatch || typeof targetNameMatch[1] === "undefined") {
        throw new NeverEntryError();
      }
      const targetName = targetNameMatch[1];
      const name = globName.replace("*", targetName);
      result.push({ name, target });
    }

    return result;
  }
  else {
    return [{ name: globName, target: globTarget }];
  }
}

// function parseExports(exportRecord: Record<string, string | undefined>, sourcePath: string): { exportName: string; chain: { filePath: string; exportName: string }[]; lastExpr: Expression }[] {
//   const result: { exportName: string; chain: { filePath: string; exportName: string }[]; lastExpr: Expression }[] = [];
//
//   const content = FsUtil.readFile(sourcePath);
//   const parsed = babelParser.parse(content, {
//     sourceType: "module"
//   });
//
//   const body = parsed.program.body;
//   for (const bodyItem of body) {
//     if (bodyItem.type === "ExportNamedDeclaration") {
//       if (bodyItem.source) {
//         for (const specifier of bodyItem.specifiers) {
//           if (specifier.type === "ExportSpecifier" && specifier.exported.type === "Identifier") {
//             const moduleName = bodyItem.source.value;
//             const importName = specifier.local.name;
//
//             const exportSourceFilePath = exportRecord[moduleName] ?? path.resolve(path.dirname(sourcePath), bodyItem.source.value);
//             const parsedExports = parseExports(exportRecord, exportSourceFilePath);
//             const parsedExport = parsedExports.single((item) => item.exportName === importName);
//             if (!parsedExport) throw new NeverEntryError();
//
//             result.push({
//               exportName: specifier.exported.name,
//               chain: [{ exportName: parsedExport.exportName, filePath: exportSourceFilePath }, ...parsedExport.chain],
//               lastExpr: parsedExport.lastExpr
//             });
//           }
//           else {
//             throw new NeverEntryError();
//           }
//         }
//       }
//       else {
//         throw new NeverEntryError();
//       }
//     }
//     else {
//       throw new NeverEntryError();
//     }
//   }
//
//   return result;
// }

// function parseNgClassExports(exportRecord: Record<string, string | undefined>, sourcePath: string): { name: string; filePathChain: string[]; ngClassMetadata: {} }[] {
//   const result: { name: string; filePathChain: string[]; ngClassMetadata: {} }[] = [];
//
//   const content = FsUtil.readFile(sourcePath);
//   const parsed = babelParser.parse(content, {
//     sourceType: "module"
//   });
//   const body = parsed.program.body;
//   for (const bodyItem of body) {
//     if (bodyItem.type === "ExportNamedDeclaration") {
//       if (bodyItem.source) {
//         for (const specifier of bodyItem.specifiers) {
//           if (specifier.type === "ExportSpecifier" && specifier.exported.type === "Identifier") {
//             const moduleName = bodyItem.source.value;
//             const exportName = specifier.local.name;
//
//             const exportSourceFilePath = exportRecord[moduleName] ?? path.resolve(path.dirname(sourcePath), bodyItem.source.value);
//             const parsedExports = parseNgClassExports(exportRecord, exportSourceFilePath);
//             const parsedExport = parsedExports.single((item) => item.name === exportName);
//             if (!parsedExport) throw new NeverEntryError();
//
//             if (parsedExport.filePathChain.length > 0) {
//               result.push({
//                 name: specifier.exported.name,
//                 filePathChain: [sourcePath, exportSourceFilePath, ...parsedExport.filePathChain],
//                 ngClassMetadata: parsedExport.ngClassMetadata
//               });
//             }
//           }
//           else {
//             throw new NeverEntryError();
//           }
//         }
//       }
//       // else {
//       //   for (const specifier of bodyItem.specifiers) {
//       //     if (specifier.type === "ExportSpecifier" && specifier.exported.type === "Identifier") {
//       //       result.push({ name: specifier.exported.name, filePathChain: [sourcePath] });
//       //     }
//       //     else {
//       //       throw new NeverEntryError();
//       //     }
//       //   }
//       // }
//     }
//     else if (bodyItem.type === "ExportAllDeclaration") {
//       throw new NeverEntryError();
//     }
//     else if (bodyItem.type === "ClassDeclaration") {
//       const decoratorsStatement = body.single((item) => (
//         item.type === "ExpressionStatement" &&
//         item.expression.type === "CallExpression" &&
//         item.expression.callee.type === "MemberExpression" &&
//         item.expression.callee.property.type === "Identifier" &&
//         item.expression.callee.property.name === "ɵɵngDeclareClassMetadata" &&
//         item.expression.arguments[0].type === "ObjectExpression" &&
//         item.expression.arguments[0].properties.some((item1) => (
//           item1.type === "ObjectProperty" &&
//           item1.key.type === "Identifier" &&
//           item1.key.name === "type" &&
//           item1.value.type === "Identifier" &&
//           item1.value.name === bodyItem.id.name
//         ))
//       ))?.["expression"]["arguments"][0].properties.single((item1) => (
//         item1.type === "ObjectProperty" &&
//         item1.key.type === "Identifier" &&
//         item1.key.name === "decorators"
//       )).value as ArrayExpression | undefined;
//       if (!decoratorsStatement) continue;
//
//       for (const decorator of decoratorsStatement.elements) {
//         if (decorator?.type !== "ObjectExpression") throw new NeverEntryError();
//
//         const isNgModule = decorator.properties.some((item) => (
//           item.type === "ObjectProperty" &&
//           item.key.type === "Identifier" &&
//           item.key.name === "type" &&
//           item.value.type === "Identifier" &&
//           item.value.name === "NgModule"
//         ));
//         if (isNgModule) {
//           const props = decorator.properties.single((item) => (
//             item.type === "ObjectProperty" &&
//             item.key.type === "Identifier" &&
//             item.key.name === "args"
//           ))?.["value"]["elements"][0].properties;
//           const provValues = props.single((item) => (
//             item.type === "ObjectProperty" &&
//             item.key.type === "Identifier" &&
//             item.key.name === "providers"
//           ))?.["value"];
//           const exportValues = props.single((item) => (
//             item.type === "ObjectProperty" &&
//             item.key.type === "Identifier" &&
//             item.key.name === "exports" &&
//             item.value
//           ))?.["value"];
//           console.log(bodyItem.id.name, provValues, exportValues);
//
//           result.push({ name: bodyItem.id.name, filePathChain: [sourcePath], ngClassMetadata: {} });
//         }
//       }
//
//       /*const ngClassMetadata = getNgClassMetadata(sourcePath, bodyItem.id.name);
//       if (ngClassMetadata) {
//         result.push({ name: bodyItem.id.name, filePathChain: [sourcePath], ngClassMetadata });
//       }*/
//     }
//   }
//
//   return result;
// }

// function getMetadataArrayValue(expression: Expression): string[] {
// }
//
// function parseEntryNgClassExports(exportRecord: Record<string, string | undefined>): { moduleName: string; exports: { name: string; filePathChain: string[] }[] }[] {
//   const result: { moduleName: string; exports: { name: string; filePathChain: string[] }[] }[] = [];
//
//   for (const exportKey of Object.keys(exportRecord)) {
//     const sourcePath = exportRecord[exportKey]!;
//     const exports = parseNgClassExports(exportRecord, sourcePath);
//     if (exports.length > 0) {
//       result.push({ moduleName: exportKey, exports });
//     }
//   }
//
//   return result;
// }
//
function parse(exportRecord: Record<string, string | undefined>): Map<string, SdCliBabelMetadata> {
  const result = new Map<string, SdCliBabelMetadata>();
  for (const exportKey of Object.keys(exportRecord)) {
    const sourcePath = exportRecord[exportKey]!;
    result.set(exportKey, new SdCliBabelMetadata(exportKey, sourcePath));
  }

  return result;
}

function find(metadataMap: Map<string, SdCliBabelMetadata>, metadata: SdCliBabelMetadata, name: string): { metadata: SdCliBabelMetadata; declaration: TDeclarationMetadata } | undefined {
  const findDeclResult = metadata.findDeclaration(name);
  if (findDeclResult) return { metadata, declaration: findDeclResult };
  const findImportResult = metadata.findImports(name);
  if (!findImportResult) return undefined;
  const newMetadata = metadataMap.get(findImportResult.moduleName);
  if (!newMetadata) return undefined;
  const findExportResult = newMetadata.findNamedExports(findImportResult.importedName);
  if (!findExportResult) return undefined;
  return find(metadataMap, newMetadata, findExportResult.localName);
}

describe("babel-parser", () => {
  it("test", () => {
    const allDepPaths = getAllDepPaths(path.resolve(process.cwd(), "packages", "sd-angular"));
    const ngDepPaths = getNgDepPaths(allDepPaths);
    const exportRecord = getExportRecord(ngDepPaths);
    const metadataMap = parse(exportRecord);

    const exportClasses: { moduleName: string; className: string; metadata: SdCliBabelMetadata; declaration: TDeclarationMetadata }[] = [];
    for (const exportKey of metadataMap.keys()) {
      const metadata = metadataMap.get(exportKey)!;
      for (const exportItem of metadata.namedExports) {
        const findResult = find(metadataMap, metadata, exportItem.localName);
        if (findResult?.declaration instanceof ClassDeclarationMetadata) {
          exportClasses.push({
            moduleName: exportKey,
            className: exportItem.exportedName,
            ...findResult
          });
        }
      }
    }

    for (const exportClass of exportClasses) {
      const ngDeclare = exportClass.metadata.findNgDeclare(exportClass.declaration.name);
      if (ngDeclare && ngDeclare.type === "NgModule") {
        console.log(exportClass.declaration.name, ngDeclare.type);
      }
    }

    /*const ngClassExports = parseEntryNgClassExports(exportRecord);
    console.log(ngClassExports);*/

    /*for (const exportKey of Object.keys(exportRecord)) {
      const exportSourcePath = exportRecord[exportKey];
      const parsed = parseExports(exportRecord, exportSourcePath);
      console.log(parsed);

      /!*const content = FsUtil.readFile(exportSourcePath);
      const parsed = babelParser.parse(content, {
        sourceType: "module"
      });
      const body = parsed.program.body;
      for (const bodyItem of body) {
        console.log(parsed);
        /!*if (bodyItem.type === "ExportNamedDeclaration") {
          if (bodyItem.specifiers.length > 0) {
            if (bodyItem.source != null) {
              console.log({
                type: "export",
                module: bodyItem.source.value,
                targets: bodyItem.specifiers.map((item) => {
                  if (item.type === "ExportSpecifier" && item.exported.type === "Identifier") {
                    return {
                      name: item.exported.name,
                      as: item.local.name
                    };
                  }
                  else {
                    throw new NeverEntryError();
                  }
                })
              });
            }
            else {
              console.log({
                type: "exportMy",
                targets: bodyItem.specifiers.map((item) => {
                  if (item.type === "ExportSpecifier" && item.exported.type === "Identifier") {
                    return {
                      name: item.exported.name,
                      as: item.local.name
                    };
                  }
                  else {
                    throw new NeverEntryError();
                  }
                })
              });
            }
          }
          else {
            throw new NeverEntryError();
          }
        }
        else if (bodyItem.type === "ExportAllDeclaration") {
          console.log({ type: "exportAll", module: bodyItem.source.value });
        }
        else if (bodyItem.type === "ExportDefaultDeclaration") {
          // 무시??
          // console.log("무시", exportKey);
        }*!/
      }*!/
    }*/
  });

  it("http/index", () => {
    const content = FsUtil.readFile(path.resolve("D:/workspaces-7/simplysm/node_modules/@angular/common/esm2020/http/index.mjs"));
    const parsed = babelParser.parse(content, {
      sourceType: "module"
    });
    const body = parsed.program.body;
    if (body[0].type === "ExportAllDeclaration") {
      console.log({
        type: "exportAll",
        module: body[0].source.value
      });
    }
  });

  it("http/public_api", () => {
    const content = FsUtil.readFile(path.resolve("D:/workspaces-7/simplysm/node_modules/@angular/common/esm2020/http/public_api.mjs"));
    const parsed = babelParser.parse(content, {
      sourceType: "module"
    });

    const body = parsed.program.body;
    for (const bodyItem of body) {
      if (bodyItem.type === "ImportDeclaration") {
        console.log({
          type: "import",
          module: bodyItem.source.value,
          targets: bodyItem.specifiers.map((item) => {
            if (item.type !== "ImportSpecifier") {
              throw new NeverEntryError();
            }
            if (item.imported.type !== "Identifier") {
              throw new NeverEntryError();
            }

            return {
              name: item.imported.name,
              as: item.local.name
            };
          })
        });
      }
      if (bodyItem.type === "ExportNamedDeclaration") {
        if (bodyItem.source != null) {
          console.log({
            type: "export",
            module: bodyItem.source.value,
            targets: bodyItem.specifiers.map((item) => {
              if (item.type !== "ExportSpecifier") {
                throw new NeverEntryError();
              }
              if (item.exported.type !== "Identifier") {
                throw new NeverEntryError();
              }

              return {
                name: item.exported.name,
                as: item.local.name
              };
            })
          });
        }
        else {
          if (bodyItem.declaration?.type === "VariableDeclaration") {
            console.log({
              type: "exportMy",
              targets: bodyItem.declaration.declarations.map((item) => {
                if (item.id.type !== "Identifier") {
                  throw new NeverEntryError();
                }
                if (item.init?.type !== "Identifier") {
                  throw new NeverEntryError();
                }

                return {
                  name: item.init.name,
                  as: item.id.name
                };
              })
            });
          }
          else {
            throw new NeverEntryError();
          }
        }
      }
    }
  });
});
