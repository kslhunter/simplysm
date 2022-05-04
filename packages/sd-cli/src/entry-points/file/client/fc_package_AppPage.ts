export const fc_package_AppPage = (): string => /* language=ts */ `
  
import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "app-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`APP_PAGE\`
})
export class AppPage {
}

`.trim();
