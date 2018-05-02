export interface SdCanDeactivatePage {
  canDeactivate(): boolean | Promise<boolean>;
}