export interface ILambdaParseResult {
  params: string[];
  returnContent: string;
}

export class LambdaParser {
  public static parse(predicate: (...args: any[]) => any): ILambdaParseResult {
    const matches: RegExpMatchArray | null = predicate
      .toString()
      .match(/function\s?\(([^)]*)\)[^{]*{((?!return)(.|\r|\n))*return\s?((.|\r|\n)*);?\s?}$/);
    if (matches === null) {
      throw new Error("Lambda 파싱 실패: " + predicate.toString() + "\n");
    }

    const params: string[] = matches[1].split(",").map(item => item.trim());
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
