export interface ISdCanDeactivatePageBase {
  canDeactivate(): boolean | Promise<boolean>;
}
