import {Exception} from "./Exception";
import {JsonConvert} from "../utils/JsonConvert";

export class InvalidArgumentsException extends Exception {
  public constructor(public args: { [key: string]: any }) {
    super(
      `입력값이 잘못되었습니다. (${Object.keys(args).map(key => `${key}: ${JsonConvert.stringify(args[key])}`).join(", ")})`,
      "InvalidArguments"
    );
  }
}