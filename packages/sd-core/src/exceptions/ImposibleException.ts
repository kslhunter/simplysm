import {Exception} from "./Exception";

export class ImposibleException extends Exception {
  public constructor() {
    super("진입불가 오류");
  }
}