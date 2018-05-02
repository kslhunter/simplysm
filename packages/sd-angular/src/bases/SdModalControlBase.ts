import {Exception} from "../../../sd-core/src";

export abstract class SdModalControlBase<I, O> {
  public param!: I;

  public abstract sdBeforeOpen(): void | Promise<void>;

  public close(value?: O): void {
    throw new Exception("모달이 초기화되어있지 않습니다.");
  }
}