export class FnUtils {
  static parse(fn: (...args: any[]) => any): { params: string[]; returnContent: string } {
    let matches: RegExpMatchArray | null =
      /function\s?\(([^)]*)\)[^{]*{((?!return)(.|\r|\n))*return\s?((.|\r|\n)*);?\s?}$/.exec(
        fn.toString(),
      );

    if (matches == null) {
      matches = /^\(?([^)]*)\)?(\s?)=>(\s?)(.*)$/.exec(fn.toString());
      if (matches?.[4] === undefined) {
        throw new Error("Function 파싱 실패: " + fn.toString() + "\n");
      }

      if (matches[4].startsWith("{")) {
        const newMatch = /(?!return)(.|\r|\n)*return\s((.|\r|\n)*);/.exec(matches[4]);
        if (newMatch?.[2] !== undefined) {
          matches[4] = newMatch[2];
        } else {
          throw new Error("Function 파싱 실패: " + fn.toString() + "\n");
        }
      }
    }

    const params: string[] = matches[1].split(",").map((item) => item.trim());
    let returnContent: string = matches[4].trim();
    if (returnContent.endsWith(";")) {
      returnContent = returnContent.slice(0, -1);
    }

    return {
      params,
      returnContent,
    };
  }
}
