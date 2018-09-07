import {ApplicationRef} from "@angular/core";
import {createNewHosts, removeNgStyles} from "@angularclass/hmr";

export class HmrAppModuleBase {
  public constructor(protected readonly _appRef: ApplicationRef) {
  }

  public hmrOnDestroy(store: any): any {
    const cmpLocation = this._appRef.components.map(cmp => cmp.location.nativeElement);
    store.disposeOldHosts = createNewHosts(cmpLocation);
    removeNgStyles();
  }

  public hmrAfterDestroy(store: any): any {
    store.disposeOldHosts();
    delete store.disposeOldHosts;
  }
}