import {NgModule} from "@angular/core";
import {SdRouterLinkDirective} from "../../directives/SdRouterLinkDirective";
import {RouterModule} from "@angular/router";

@NgModule({
  imports: [
    RouterModule
  ],
  declarations: [
    SdRouterLinkDirective
  ],
  exports: [
    SdRouterLinkDirective
  ],
  entryComponents: [],
  providers: []
})
export class SdRouterLinkDirectiveModule {
}