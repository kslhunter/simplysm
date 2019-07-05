import "@simplysm/sd-core";
import * as sass from "node-sass";
import * as webpack from "webpack";
import * as fs from "fs-extra";

function loader(this: webpack.loader.LoaderContext, content: string, sourceMap: any): void {
  if (this.cacheable) {
    this.cacheable();
  }

  if (!fs.pathExistsSync(this.resourcePath)) {
    this.callback(undefined);
    return;
  }

  try {
    const reloadContent = fs.readFileSync(this.resourcePath).toString();

    const scssRegex = /(scss\()?\/\* *language=SCSS *\*\/ *[`"'](((?!['"`]\)?[\],][,;]?[\r\n\\])(.|\r|\n))*)['"`]\)?/;

    const matches = reloadContent.match(new RegExp(scssRegex, "gi"));
    if (matches) {
      const results = matches.map(match => {
        try {
          return sass.renderSync({
            file: this.resourcePath,
            data: match.match(scssRegex)![2],
            sourceMap: false
          });
        }
        catch (err) {
          this.emitWarning(err);
        }
      });

      const includedFiles = results
        .filterExists()
        .map(result => result.stats.includedFiles)
        .mapMany(item => item)
        .distinct();

      for (const includedFile of includedFiles) {
        this.addDependency(includedFile);
      }
    }
  }
  catch (err) {
    this.emitWarning(err);
  }

  this.callback(undefined, content, sourceMap);
}

export = loader;
