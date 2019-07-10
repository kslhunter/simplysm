import "@simplysm/sd-core";
import * as webpack from "webpack";
import * as fs from "fs-extra";
import {SdAngularUtils} from "../commons/SdAngularUtils";

function loader(this: webpack.loader.LoaderContext, content: string, sourceMap: any): void {
  if (this.cacheable) {
    this.cacheable();
  }

  if (!fs.pathExistsSync(this.resourcePath)) {
    this.callback(undefined);
    return;
  }

  try {
    const reloadContent = fs.readFileSync(this.resourcePath, "utf-8");

    const result = SdAngularUtils.replaceScssToCss(this.resourcePath, reloadContent);
    for (const dependency of result.dependencies) {
      this.addDependency(dependency);
    }
  }
  catch (err) {
    this.emitWarning(err);
  }

  this.callback(undefined, content, sourceMap);
}

export = loader;
