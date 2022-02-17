import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdCanDeactivateGuard } from "./sd-can-deactivate.guard";

@NgModule({
  imports: [CommonModule],
  declarations: [],
  exports: [],
  providers: [SdCanDeactivateGuard]
})
export class SdCanDeactivateModule {
}
