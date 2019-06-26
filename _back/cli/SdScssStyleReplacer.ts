import * as ts from "typescript";
import * as sass from "node-sass";

export class SdScssStyleReplacer {
  public static inject<T extends ts.BuilderProgram>(host: { readFile: (fileName: string, encoding?: string) => string | undefined }, sourceMap?: boolean): void {
    const prevReadFile = host.readFile;
    host.readFile = (fileName, encoding) => {
      const content = prevReadFile(fileName, encoding);
      if (!content) return content;

      const scssRegex = /(scss\()?\/\* *language=SCSS *\*\/ *[`"'](((?!['"`]\)?[\],][,;]?[\r\n\\])(.|\r|\n))*)['"`]\)?/;

      let newContent = content;
      const matches = newContent.match(new RegExp(scssRegex, "gi"));
      if (matches) {
        const results = matches.map(match => {
          try {
            return sass.renderSync({
              file: fileName,
              data: match.match(scssRegex)![2],
              sourceMapEmbed: sourceMap,
              outputStyle: "compressed"
            });
          }
          catch (err) {
            console.error(err, match.match(scssRegex)![2]);
            throw err;
          }
        });

        let i = 0;
        newContent = newContent.replace(new RegExp(scssRegex, "gi"), () => {
          let result = "`" + results[i].css.toString() + "`";
          const prev = matches[i];

          const diffCount = Array.from(prev).filter(item => item === "\n").length - Array.from(result).filter(item => item === "\n").length;
          result += "/* tslint:disable */";
          for (let j = 0; j < diffCount; j++) {
            result += "\n";
          }
          result += "/* tslint:enable */";

          i++;
          return result;
        });
      }

      return newContent;
    };
  }
}
