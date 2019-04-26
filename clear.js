const fs = require("fs");
const path = require("path");

removeRecursiveAsync(
  process.cwd(),
  contentPath =>
    /[\\/]yarn\.lock$/.test(contentPath) ||
    /[\\/]node_modules$/.test(contentPath) ||
    /[\\/]node_modules[\\/]/.test(contentPath) ||
    /[\\/]tsconfig\.build\.json$/.test(contentPath) ||
    /[\\/]dist$/.test(contentPath) ||
    /[\\/]dist[\\/]/.test(contentPath) ||
    /[\\/]yarn-error\.log$/.test(contentPath)
).catch(err => {
  console.error(err);
});

async function removeRecursiveAsync(dirPath, predicate) {
  const contentNames = fs.readdirSync(dirPath);
  await Promise.all(
    contentNames.map(
      contentName =>
        new Promise(async (resolve, reject) => {
          try {
            const contentPath = path.resolve(dirPath, contentName);
            if (predicate(contentPath)) {
              if (fs.lstatSync(contentPath).isDirectory()) {
                await removeRecursiveAsync(contentPath, predicate);
                fs.rmdirSync(contentPath);
              } else {
                fs.unlinkSync(contentPath);
              }

              resolve();
              return;
            }

            resolve();
          } catch (err) {
            reject(err);
          }
        })
    )
  );
}
