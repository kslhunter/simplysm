import {ChangeDetectionStrategy, Component, Injector} from "@angular/core";
import {NavigationStart, Router} from "@angular/router";

@Component({
    selector: "sd-sidebar-container",
    template: `
        <div class="_backdrop"
             (click)="toggled = false"></div>
        <ng-content></ng-content>`,
    host: {
        "[class._toggled]": "toggled"
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdSidebarContainerControl {
    private _toggled = false;

    set toggled(value: boolean) {
        if (this._toggled !== value) {
            this._toggled = value;
        }
    }

    get toggled(): boolean {
        return this._toggled;
    }

    constructor(private _router: Router) {
        this._router.events.subscribe(value => {
            if (value instanceof NavigationStart) {
                this.toggled = false;
            }
        });
    }
}

@Component({
    selector: "sd-sidebar",
    template: `
        <ng-content></ng-content>`,
    host: {
        "[class._toggled]": "toggled"
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdSidebarControl {
    get toggled(): boolean {
        return this._injector.get(SdSidebarContainerControl, {toggled: false}).toggled;
    }

    constructor(private _injector: Injector) {
    }
}