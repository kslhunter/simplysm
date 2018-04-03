export abstract class SdPrintControlTemplateBase<I> {
    param!: I;

    abstract sdBeforeOpen(): Promise<void>;
}