import {NgModule} from "@angular/core";
import {SdRouterLinkDirective} from "../../directives/SdRouterLinkDirective";
import {RouterModule} from "@angular/router";
import {SdAngularModule} from "../../SdAngularModule";

@NgModule({
  imports: [
    RouterModule,
    SdAngularModule
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