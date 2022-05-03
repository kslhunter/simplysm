export const fc_package_AppPage = (): string => /* language=ts */ `
  
import { ChangeDetectionStrategy, Component, HostListener } from "@angular/core";
import { DevModal } from "./modals/DevModal";
import { SdModalProvider } from "@simplysm/sd-angular";

@Component({
  selector: "app-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`APP_PAGE\`
})
export class AppPage {
  public constructor(private readonly _modal: SdModalProvider) {
  }

  @HostListener("document:keydown", ["$event"])
  public async onKeydown(event: KeyboardEvent): Promise<void> {
    if (
      process.env["NODE_ENV"] !== "production"
      && event.ctrlKey
      && event.altKey
      && event.shiftKey
      && event.key === "F12"
    ) {
      event.preventDefault();
      event.stopPropagation();

      await this._modal.showAsync(DevModal, "DEV", undefined, { key: "dev-modal" });
    }
  }
}

`.trim();
