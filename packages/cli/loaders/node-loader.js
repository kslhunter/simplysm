const path = require("path");
const fs = require("fs-extra");

module.exports = function () {
  fs.copySync(this.resourcePath, path.resolve(this._compiler.options.output.path, path.relative(process.cwd(), this.resourcePath)));
  return `
try {
  global.process.dlopen(module, './${path.relative(process.cwd(), this.resourcePath).replace(/\\/g, "/")}');
} catch(e) {
  throw new Error('Cannot open ./${path.relative(process.cwd(), this.resourcePath).replace(/\\/g, "/")}: ' + e);
}`.trim();
};
