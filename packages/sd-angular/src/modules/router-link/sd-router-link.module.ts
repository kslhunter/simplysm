import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { SdRouterLinkDirective } from "./sd-router-link.directive";

@NgModule({
  imports: [CommonModule, RouterModule],
  declarations: [SdRouterLinkDirective],
  exports: [SdRouterLinkDirective],
  providers: []
})
export class SdRouterLinkModule {
}
