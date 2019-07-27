const fs = require("fs");


// yarn.lock 말고 각 node_modules의 패키지중 prodDep, devDep, peerDep 으로 검색해야함..
// yarn.lock 으론 peerDep 체크가 안됨
const content = fs.readFileSync("yarn.lock").toString();
const matches = content.match(/.*[0-9*]:/g);
const yarnPackageCounts = {};
for (const match of matches) {
  const packageName = match.split("@")[0];

  yarnPackageCounts[packageName] = (yarnPackageCounts[packageName] || 0) + 1;
}

const duplicatedYarnPackageKeys = Object.keys(yarnPackageCounts).filter(key => yarnPackageCounts[key] > 1);

const myPackages = fs.readdirSync("packages");
let allDeps = {};
for (const pkg of myPackages) {
  const packageJson = JSON.parse(fs.readFileSync(`packages/${pkg}/package.json`).toString());

  allDeps = {
    ...allDeps,
    ...packageJson["dependencies"] || {},
    ...packageJson["devDependencies"] || {},
    ...packageJson["peerDependencies"] || {}
  };
}

for (const duplicatedYarnPackageKey of duplicatedYarnPackageKeys) {
  if (Object.keys(allDeps).includes(duplicatedYarnPackageKey)) {
    console.log(duplicatedYarnPackageKey + "@" + allDeps[duplicatedYarnPackageKey]);
  }
}