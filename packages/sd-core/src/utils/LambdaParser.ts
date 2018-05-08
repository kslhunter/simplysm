import {Exception} from "../exceptions/Exception";

export class LambdaParser {
  public static parse(predicate: (...args: any[]) => any): { params: string[]; returnContent: string } {
    const matches = predicate.toString().match(/function\s?\(([^)]*)\)[^{]*{((?!return)(.|\r|\n))*return\s?((.|\r|\n)*);?\s?}$/);
    if (!matches) {
      throw new Exception(`Lambda 파싱 실패:\n${predicate.toString()}\n)`);
    }
    const params = matches[1].split(",").map(item => item.trim());
    let returnContent = matches[4].trim();
    if (returnContent.endsWith(";")) {
      returnContent = returnContent.slice(0, -1);
    }

    return {
      params,
      returnContent
    };
  }
}