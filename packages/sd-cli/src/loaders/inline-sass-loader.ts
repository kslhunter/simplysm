import * as sass from "node-sass";
import * as path from "path";
import * as webpack from "webpack";

function loader(this: webpack.loader.LoaderContext, content: string, sourceMap: any): void {
  if (this.cacheable) {
    this.cacheable();
  }

  try {
    const scssRegex = /(scss\()?\/\* *language=SCSS *\*\/ *[`"'](((?!['"`]\)?[\],][,;]?[\r\n\\])(.|\r|\n))*)['"`]\)?/;

    let newContent = content;
    const matches = content.match(new RegExp(scssRegex, "gi"));
    if (matches) {
      const results = matches.map(match => {
        try {
          return sass.renderSync({
            file: this.resourcePath,
            data: match.match(scssRegex)![2],
            sourceMapEmbed: false,
            sourceMap: false
          });
        }
        catch (err) {
          console.error(err, match.match(scssRegex)![2]);
          throw err;
        }
      });

      const includedFiles = results.map(result => result.stats.includedFiles).reduce((a, b) => a.concat(b));
      for (const includedFile of includedFiles) {
        this.dependency(path.normalize(includedFile));
      }

      let i = 0;
      newContent = newContent.replace(new RegExp(scssRegex, "gi"), () => "`" + results[i++].css + "`");
    }

    this.callback(undefined, newContent, sourceMap);
  }
  catch (err) {
    this.callback(undefined, content, sourceMap);
    console.error(err);
  }
}

export = loader;

