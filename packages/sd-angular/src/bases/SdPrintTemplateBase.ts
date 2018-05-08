export abstract class SdPrintTemplateBase<I> {
  public params!: I;

  public abstract sdBeforeOpen(): Promise<void>;
}
