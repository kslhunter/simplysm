export abstract class SdModalBase<P, R> {
  public _tParam!: P;
  public _tResult!: R;

  public abstract sdOnOpen(param: P): Promise<void>;

  public close: (value?: R) => void = (value?: R) => {
    throw new Error("모달이 초기화되어있지 않습니다.");
  };
}
