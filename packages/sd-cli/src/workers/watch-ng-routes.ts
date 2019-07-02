import * as path from "path";
import {SdWorkerUtils} from "../commons/SdWorkerUtils";
import {SdTypescriptBuilder} from "../SdTypescriptBuilder";
import {JSDOM} from "jsdom";

require("source-map-support/register"); //tslint:disable-line

const packageKey = process.argv[2];

const contextPath = path.resolve(process.cwd(), "packages", packageKey);
const tsConfigPath = path.resolve(contextPath, "tsconfig.build.json");
/*const tsConfig = ts.parseJsonConfigFileContent(fs.readJsonSync(tsConfigPath), ts.sys, contextPath);
const rootDirPath = tsConfig.options.rootDir!;*/

SdWorkerUtils.sendMessage({type: "run"});

const builder = new SdTypescriptBuilder(tsConfigPath);
builder.watch(
  changedInfos => {
    const ngModules = builder.getNgModules();
    const ngComponents = builder.getNgComponentAndDirectives();

    for (const changedInfo of changedInfos) {
      if (changedInfo.type === "dependency" || changedInfo.type === "dependency-scss") {
        continue;
      }

      if (changedInfo.type === "unlink") {
        throw new Error("미구현");
      }

      const pagesDirPath = path.resolve(builder.rootDirPath, "pages");
      const modalsDirPath = path.resolve(builder.rootDirPath, "modals");
      const controlsDirPath = path.resolve(builder.rootDirPath, "controls");

      const modulesDirPath = path.resolve(builder.rootDirPath, "modules");

      // ...Module.ts 파일 세팅
      if (
        changedInfo.filePath.startsWith(controlsDirPath) ||
        changedInfo.filePath.startsWith(pagesDirPath) ||
        changedInfo.filePath.startsWith(modalsDirPath)
      ) {
        // console.log("...Module.ts", changedInfo.filePath);

        const className = path.basename(changedInfo.filePath, path.extname(changedInfo.filePath));
        const outDirPath = path.resolve(modulesDirPath, path.relative(contextPath, path.dirname(changedInfo.filePath)));
        const outFilePath = path.resolve(outDirPath, className + "Module.ts");

        // console.log("...Module.ts", changedInfo.filePath, "outFilePath", outFilePath);

        let content = ``;
        content += `import {NgModule} from "@angular/core";\n`;
        content += `import {CommonModule} from "@angular/common";\n`;

        const fileRelativePath = path.relative(outFilePath, changedInfo.filePath);
        content += `import {${className}} from "${fileRelativePath.replace(/\\/g, "/")}";\n`;

        const imports = builder.getImports(changedInfo.filePath);

        const useModules = [];
        useModules.push(
          ...ngModules.filter(item => item.exports.concat(item.providers).some(exp => imports.some(imp => imp.targets.includes(exp))))
        );

        const componentTemplate = ngComponents.single(item => item.path === changedInfo.filePath)!.template;
        const componentDom = new JSDOM(componentTemplate);
        for (const ngComponent of ngComponents) {
          if (componentDom.window.document.querySelector(ngComponent.selector)) {
            useModules.push(...ngModules.filter(item => item.exports.includes(ngComponent.name)));
          }
        }

        /*const sdComponentMatches = componentTemplate.match(/<[^ >]*!/g) || [];
        for (const sdComponentMatch of sdComponentMatches) {
          const componentSelector = sdComponentMatch.slice(1);
          const component = ngComponents.single(item => item.selector === componentSelector);

          if (component) {
            useModules.push(...ngModules.filter(item => item.exports.includes(component.name)));
          }
        }*/

        // console.log("...Module.ts", changedInfo.filePath, "useMyModules.name", useModules.map(item => item.name));

        const importInfos = useModules.map(item => {
          let module = item.module;
          if (!module) {
            module = path.relative(changedInfo.filePath, item.path).replace(/\\/g, "/");
            module = module.startsWith(".") ? module : "./" + module;
          }

          return {
            name: item.name,
            module
          };
        }).distinct();

        for (const group of importInfos.orderBy(item => item.name).groupBy(item => item.module)) {
          if (group.values.length > 1) {
            content += `import {\n`;
            content += group.values.map(item => `  ${item.name}`).join(",\n") + "\n";
            content += `} from "${group.key}";\n`;
          }
          else {
            content += `import {${group.values[0].name}} from "${group.key}";\n`;
          }
        }

        content += `\n`;

        content += `@NgModule({\n`;
        content += `  imports: [\n`;
        content += `    CommonModule,\n`;
        content += importInfos.orderBy(item => item.name).map(item => `    ${item.name}`).join(",\n") + "\n";
        content += `  ],\n`;
        content += `  declarations: [${className}],\n`;
        content += `  exports: [${className}]\n`;
        content += `})\n`;
        content += `export class ${className}Module {\n`;
        content += `}`;

        if (changedInfo.filePath.includes("HomePage")) {
          console.log("...Module.ts", changedInfo.filePath, "content", content);
        }
      }

      /*if (changedInfo.filePath.startsWith(pagesDirPath)) {
        console.log("...RoutingModule.ts", changedInfo.filePath);
      }

      // pages => routes.ts 파일 세팅
      const rootRoutesFileRegex = new RegExp(pagesDirPath.replace(/[\\/]/g, "[\\\\/]") + "[^\\\\/]*Page.ts");
      if (rootRoutesFileRegex.test(changedInfo.filePath)) {
        console.log("routes.ts", changedInfo.filePath);
      }*/
    }

    SdWorkerUtils.sendMessage({type: "done"});
  },
  () => {
    SdWorkerUtils.sendMessage({type: "run"});
  }
).catch(err => {
  SdWorkerUtils.sendMessage({type: "error", message: err.stack});
});
