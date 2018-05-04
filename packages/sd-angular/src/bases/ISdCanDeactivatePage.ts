export interface ISdCanDeactivatePage {
  canDeactivate(): boolean | Promise<boolean>;
}
