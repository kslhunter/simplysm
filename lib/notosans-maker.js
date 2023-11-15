import path from "path";
import fs from "fs";
import https from "https";

// 설정값
const inputCssUrl = "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@100;400;700;900&display=swap";
const fontTargetPath = ".";
const fontName = "notosanskr";

// 고정값
const outputDirPath = path.resolve(process.cwd(), "output");
const outputCssFilePath = fontName + ".css";
const outputFontsDirPath = "scss/fonts/" + fontName;
const outputScssFilePath = "scss/_" + fontName + ".scss";


(async () => {
  // if (fs.existsSync(outputDirPath)) {
  //   await fs.promises.rm(outputDirPath, {recursive: true});
  // }
  //
  // await fs.promises.mkdir(outputDirPath, {recursive: true});
  // await fs.promises.mkdir(path.resolve(outputDirPath, outputFontsDirPath), {recursive: true});

  const outputCssFileStream = fs.createWriteStream(path.resolve(outputDirPath, outputCssFilePath));

  await new Promise((resolve, reject) => {
    https.get(inputCssUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36"
      }
    }, function (response) {
      response.pipe(outputCssFileStream);
      process.stdout.write(".");

      response.on("error", err => {
        reject(err);
      });

      response.on("close", () => {
        resolve();
      });
    }).on("error", (err) => {
      reject(err);
    });
  });

  const content = fs.readFileSync(path.resolve(outputDirPath, outputCssFilePath), "utf8");
  // const urlList = content.match(/url\([^)]*\)/g);
  // for (const link of urlList.map(item => item.replace(/url\(([^)]*)\)/, (_, match) => match))) {
  //   const fileName = link.split("/").slice(-1)[0];
  //   const file = fs.createWriteStream(path.resolve(outputDirPath, outputFontsDirPath, fileName));
  //   await new Promise((resolve, reject) => {
  //     https.get(link, function (response) {
  //       response.pipe(file);
  //       process.stdout.write(".");
  //
  //       response.on("error", err => {
  //         reject(err);
  //       });
  //
  //       response.on("close", () => {
  //         resolve();
  //       });
  //     }).on("error", (err) => {
  //       reject(err);
  //     });
  //   });
  // }

  const newContent = content.replace(/url\(([^)]*)\)/g, (item, match) => "url(" + fontTargetPath + "/fonts/" + fontName + "/" + match.split("/").slice(-1) + ")");
  await fs.promises.writeFile(path.resolve(outputDirPath, outputScssFilePath), newContent, "utf8");
})().catch(err => {
  console.error(err);
});
