import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdMutationDirective } from "./sd-mutation.directive";

@NgModule({
  imports: [CommonModule],
  declarations: [SdMutationDirective],
  exports: [SdMutationDirective],
  providers: []
})
export class SdMutationModule {
}
