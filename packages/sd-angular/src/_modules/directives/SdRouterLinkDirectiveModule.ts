import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdRouterLinkDirective} from "../../directives/SdRouterLinkDirective";
import {RouterModule} from "@angular/router";

@NgModule({
  imports: [
    CommonModule,
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