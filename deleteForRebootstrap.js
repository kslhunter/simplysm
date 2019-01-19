const fs = require("fs");
const path = require("path");

removeRecursive(process.cwd(), contentPath =>
  contentPath.endsWith("yarn.lock") ||
  contentPath.endsWith("node_modules") ||
  contentPath.endsWith("tsconfig.build.json") ||
  contentPath.endsWith("dist") ||
  contentPath.endsWith("yarn-error.log")
).catch(err => {
  console.error(err);
});

async function removeRecursive(dirPath, predicate) {
  const contentNames = fs.readdirSync(dirPath);
  await Promise.all(contentNames.map(contentName => new Promise(async (resolve, reject) => {
    try {
      const contentPath = path.resolve(dirPath, contentName);
      if (predicate(contentPath)) {
        if (fs.lstatSync(contentPath).isDirectory()) {
          fs.rmdirSync(contentPath);
        }
        else {
          fs.unlinkSync(contentPath);
        }
        resolve();
        return;
      }

      if (fs.lstatSync(contentPath).isDirectory()) {
        await removeRecursive(contentPath, predicate);
      }

      resolve();
    }
    catch (err) {
      reject(err);
    }
  })));
}
