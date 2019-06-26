const fs = require("fs");

const content = fs.readFileSync("yarn.lock").toString();
const matches = content.match(/ {4}.* "[^^*>].*/g);
const yarnDeps = [];
for (const match of matches) {
  const split = match.trim().replace(/"/g, "").split(" ");
  if (!yarnDeps.some(item => item.name === split[0] && item.version === split[1])) {
    yarnDeps.push({
      name: split[0],
      version: split[1]
    });
  }
}

console.log(yarnDeps.sort((a, b) => a.name > b.name ? 1 : a.name === b.name ? 0 : -1));

/*
const packages = fs.readdirSync("packages");
for (const pkg of packages) {
  const packageJson = JSON.parse(fs.readFileSync(`packages/${pkg}/package.json`).toString());
  const deps = {
    ...packageJson["dependencies"] || {},
    ...packageJson["devDependencies"] || {},
    ...packageJson["peerDependencies"] || {},
  };

  console.log(pkg, deps);
}
*/
