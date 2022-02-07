import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdOrmServiceProvider } from "./sd-orm-service.provider";

@NgModule({
  imports: [CommonModule],
  declarations: [],
  exports: [],
  providers: [SdOrmServiceProvider]
})
export class SdOrmServiceModule {
}
