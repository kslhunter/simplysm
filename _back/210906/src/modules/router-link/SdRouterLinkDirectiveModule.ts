import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdRouterLinkDirective } from "./SdRouterLinkDirective";
import { RouterModule } from "@angular/router";

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
  ]
})
export class SdRouterLinkDirectiveModule {
}
