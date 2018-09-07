const loaderUtils = require("loader-utils");
const sass = require("node-sass");
const path = require("path");

module.exports = function (content, sourceMap) {
  if (this.cacheable) {
    this.cacheable();
  }

  const options = loaderUtils.getOptions(this) || {};

  const scssRegex = /(scss\()?\/\* *language=SCSS *\*\/ *[`"'](((?!['"`]\)?[\],][,;]?[\r\n\\])(.|\r|\n))*)['"`]\)?/;

  let newContent = content;
  const matches = content.match(new RegExp(scssRegex, "gi"));
  if (matches) {
    const results = matches.map(match => {
      try {
        return sass.renderSync({
          file: this.resourcePath,
          data: match.match(scssRegex)[2],
          sourceMapEmbed: options.sourceMap
        });
      }
      catch (err) {
        console.error(err, match.match(scssRegex)[2]);
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
};