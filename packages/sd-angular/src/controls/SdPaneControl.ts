import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
    selector: "sd-pane",
    template: `
        <ng-content></ng-content>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdPaneControl {
}