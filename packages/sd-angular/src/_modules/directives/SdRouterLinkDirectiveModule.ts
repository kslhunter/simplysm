import {NgModule} from "@angular/core";
import {../../directives/SdRouterLinkDirective} from "../../directives/SdRouterLinkDirective";
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
  entryComponents: []
})
export class SdRouterLinkDirectiveModule {
}