export class FunctionUtil {
  public static parse(fn: (...args: any[]) => any): { params: string[]; returnContent: string } {
    let matches: RegExpMatchArray | null = fn.toString().match(/function\s?\(([^)]*)\)[^{]*{((?!return)(.|\r|\n))*return\s?((.|\r|\n)*);?\s?}$/);
    if (matches === null) {
      matches = fn.toString().match(/^\(?([^)]*)\)?(\s?)=>(\s?)(.*)$/);
      if (matches === null) {
        throw new Error("Function 파싱 실패: " + fn.toString() + "\n");
      }

      if (!matches[4]) {
        throw new Error("Function 파싱 실패: " + fn.toString() + "\n");
      }

      if (matches[4].startsWith("{")) {
        const newMatch = matches[4].match(/(?!return)(.|\r|\n)*return\s((.|\r|\n)*);/);
        if (newMatch && newMatch[2]) {
          matches[4] = newMatch[2];
        }
        else {
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
      returnContent
    };
  }
}