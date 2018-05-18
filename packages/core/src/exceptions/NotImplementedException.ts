import {Exception} from "./Exception";

export class NotImplementedException extends Exception {
  public constructor() {
    super(`아직 구현되지 않았습니다`);
  }
}
