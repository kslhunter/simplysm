export abstract class SdPrintControlTemplateBase<I> {
  public param!: I;

  public abstract sdBeforeOpen(): Promise<void>;
}
