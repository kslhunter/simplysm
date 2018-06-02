import {ApplicationRef} from "@angular/core";
import {createNewHosts, removeNgStyles} from "@angularclass/hmr";

export class HmrAppModuleBase {
  public constructor(protected readonly _appRef: ApplicationRef/*,
                     protected readonly _hmrStore: HmrStoreProvider*/) {
  }

  /*public hmrOnInit(store: any): any {
    if (!store || !store.state) return;
    this._hmrStore.state = store.state;

    this._appRef.tick();
    delete store.state;
  }*/

  public hmrOnDestroy(store: any): any {
    const cmpLocation = this._appRef.components.map(cmp => cmp.location.nativeElement);
    store.disposeOldHosts = createNewHosts(cmpLocation);
    /*store.state = this._hmrStore.state;*/
    removeNgStyles();
  }

  public hmrAfterDestroy(store: any): any {
    store.disposeOldHosts();
    delete store.disposeOldHosts;
  }
}