export abstract class SdPrintTemplateBase<I> {
  public abstract sdOnOpen(param: I): Promise<void>;
}
