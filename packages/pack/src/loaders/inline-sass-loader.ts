const loaderUtil = require("loader-utils");
const sass = require("node-sass");
const path = require("path");

module.exports = function (source, sourcemap) {
  this.cacheable && this.cacheable();

  const options = loaderUtil.getOptions(this) || {};

  const scssRegex = /\/\* *language=SCSS *\*\/ *[`"']([^`"']*)[`"']/;

  const matches = source.match(new RegExp(scssRegex, "gi"));
  if (matches) {
    const results = matches.map(match => {
      return sass.renderSync({
        file: this.resourcePath,
        data: JSON.parse(`"${match.match(scssRegex)[1]}"`),
        sourceMapEmbed: options.sourceMap
      });
    });

    const includedFiles = results.map(result => result.stats.includedFiles).reduce((a, b) => a.concat(b));
    for (const includedFile of includedFiles) {
      this.dependency(path.normalize(includedFile))
    }

    let i = 0;
    source = source.replace(new RegExp(scssRegex, "gi"), () => "`" + results[i++].css + "`");
  }

  if (source.includes("sd-button")) {
    console.log(source);
  }

  this.callback(null, source, sourcemap);
};