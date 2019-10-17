import {CustomError} from "./CustomError";

export class ArgumentError extends CustomError {
  public constructor(argObj: { [key: string]: any }) {
    super("인수가 잘못되었습니다: " + JSON.stringify(argObj));
  }
}