import * as sass from "node-sass";
import * as path from "path";
import * as os from "os";

export class SdAngularUtil {
  public static replaceScssToCss(filePath: string, content: string): { content: string; dependencies: string[] } {
    const scssRegex = /\/\* *language=SCSS *\*\/ *[`"'](((?!['"`]\)?[\],][,;]?[\r\n\\])(.|\r|\n))*)['"`]/;

    const matches = content.match(new RegExp(scssRegex, "gi"));
    if (!matches) {
      return { content, dependencies: [] };
    }

    const results = matches.map((match) => sass.renderSync({
      file: filePath,
      data: scssRegex.exec(match)?.[1],
      sourceMapEmbed: false,
      sourceMap: false,
      outputStyle: "compact"
    }));

    const deps = results.mapMany((result) => result.stats.includedFiles).map((item) => path.resolve(item));

    let i = 0;
    const newContent = content.replace(new RegExp(scssRegex, "gi"), () => {
      let result = "`" + results[i].css.toString() + "`";
      const prev = matches[i];

      const diffCount = Array.from(prev).filter((item) => item === "\n").length -
        Array.from(result).filter((item) => item === "\n").length;

      for (let j = 0; j < diffCount; j++) {
        result += os.EOL;
      }

      i += 1;
      return result;
    });

    return { content: newContent, dependencies: deps };
  }
}