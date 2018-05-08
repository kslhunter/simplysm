import {Exception} from "@simplism/sd-core";

export abstract class SdModalBase<I, O> {
  public params!: I;

  public abstract sdBeforeOpen(): void | Promise<void>;

  public close(value?: O): void {
    throw new Exception("모달이 초기화되어있지 않습니다.");
  }
}
