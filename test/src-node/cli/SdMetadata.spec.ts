import * as path from "path";
import {SdBundleMetadata} from "@simplysm/sd-cli/src/utils/SdMetadata";

describe("(node) cli.SdModuleMetadata", () => {
  it("1", async () => {
    const metadataFilePaths = [
      path.resolve(process.cwd(), "node_modules/@angular/common/common.metadata.json"),
      path.resolve(process.cwd(), "node_modules/@angular/core/core.metadata.json"),
      path.resolve(process.cwd(), "node_modules/@angular/platform-browser/platform-browser.metadata.json"),
      path.resolve(process.cwd(), "node_modules/@angular/router/router.metadata.json")
    ];

    const metadataBundle = new SdBundleMetadata();
    for (const metadataFilePath of metadataFilePaths) {
      await metadataBundle.registerAsync(metadataFilePath);
    }

    console.log(metadataBundle.ngModuleDefs);

    /*for (const module of metadataBundle.modules) {
      for (const moduleClass of module.classes) {
        if (!moduleClass.decorators) continue;

        for (const decorator of moduleClass.decorators) {
          if (decorator.expression.module === "@angular/core" && decorator.expression.name === "NgModule") {
            if (!decorator.arguments || !decorator.arguments[0]) throw new NotImplementError();

            // EXPORTS
            const exportClasses = decorator.arguments[0].getChildList("exports");
            if (exportClasses) {
              for (const exportClass of exportClasses) {
                if (!(exportClass instanceof SdClassMetadata)) throw new NotImplementError();
                if (!exportClass.decorators) throw new NotImplementError();

                for (const exportClassDecorator of exportClass.decorators) {
                  if (exportClassDecorator.expression.module === "@angular/core") {
                    if (exportClassDecorator.expression.name === "Component") {
                      if (!exportClassDecorator.arguments || !exportClassDecorator.arguments[0]) throw new NotImplementError();

                      const selector = exportClassDecorator.arguments[0].getChildString("selector");

                      console.log(module.name, moduleClass.name, exportClass.name, exportClassDecorator.expression.name, selector);
                    }
                    else if (exportClassDecorator.expression.name === "Directive") {
                      if (!exportClassDecorator.arguments || !exportClassDecorator.arguments[0]) throw new NotImplementError();

                      const selector = exportClassDecorator.arguments[0].getChildString("selector");

                      console.log(module.name, moduleClass.name, exportClass.name, exportClassDecorator.expression.name, selector);
                    }
                    else if (exportClassDecorator.expression.name === "Pipe") {
                      if (!exportClassDecorator.arguments || !exportClassDecorator.arguments[0]) throw new NotImplementError();

                      const pipeName = exportClassDecorator.arguments[0].getChildString("name");

                      console.log(module.name, moduleClass.name, exportClass.name, exportClassDecorator.expression.name, pipeName);
                    }
                    else if (exportClassDecorator.expression.name === "Injectable") {
                      console.log(module.name, moduleClass.name, exportClass.name, exportClassDecorator.expression.name);
                    }
                  }
                }
              }
            }

            // PROVIDERS
            const providers = decorator.arguments[0].getChildList("providers");
            if (providers) {
              for (const provider of providers) {
                if (provider instanceof SdObjectMetadata) {
                  const providerProvide = provider.getChild("provide");
                  if (providerProvide instanceof SdClassMetadata) {
                    console.log(module.name, moduleClass.name, providerProvide.name);
                  }
                  else if (providerProvide instanceof SdCallMetadata) {
                    console.log(module.name, moduleClass.name, providerProvide.expression.module + "." + providerProvide.expression.name);
                  }
                  else {
                    throw new NotImplementError();
                  }
                }
                else {
                  throw new NotImplementError();
                }
              }
            }


            // STATIC PROVIDERS
            if (moduleClass.staticFunctions) {
              for (const staticFunction of moduleClass.staticFunctions) {
                if (!staticFunction.value) continue;
                const staticProviders = staticFunction.value.getChildList("providers");
                if (!staticProviders) continue;

                for (const staticProvider of staticProviders) {
                  if (staticProvider instanceof SdObjectMetadata) {
                    const staticProviderProvide = staticProvider.getChild("provide");
                    if (staticProviderProvide instanceof SdClassMetadata) {
                      console.log(module.name, moduleClass.name, staticProviderProvide.name);
                    }
                    else if (staticProviderProvide instanceof SdCallMetadata) {
                      console.log(module.name, moduleClass.name, staticProviderProvide.expression.module + "." + staticProviderProvide.expression.name);
                    }
                    else {
                      throw new NotImplementError();
                    }
                  }
                  else if (staticProvider instanceof SdClassMetadata) {
                    console.log(module.name, moduleClass.name, staticProvider.name);
                  }
                  else if (staticProvider instanceof SdCallMetadata) {
                    console.log(module.name, moduleClass.name, staticProvider.expression.module + "." + staticProvider.expression.name);
                  }
                  else {
                    throw new NotImplementError();
                  }
                }
              }
            }
          }
        }
      }
    }*/
  });
});
