import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MainPage } from "./MainPage";
import { RouterModule } from "@angular/router";
import { SdTopbarContainerControlModule, SdTopbarControlModule } from "@simplysm/sd-angular";

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild([{ path: "", component: MainPage }]),
    SdTopbarContainerControlModule,
    SdTopbarControlModule
  ],
  declarations: [MainPage],
  providers: []
})
export class MainPageModule {
}
