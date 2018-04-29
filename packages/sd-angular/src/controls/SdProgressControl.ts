import {ChangeDetectionStrategy, Component, forwardRef, Inject, Input} from "@angular/core";

@Component({
    selector: "sd-progress",
    template: `
        <div class="_sd-progress-content">
            {{ label || "&nbsp;" }}
        </div>
        <ng-content></ng-content>`,
    host: {
        "[class._size-lg]": "size === 'lg'"
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdProgressControl {
    @Input() public label = "";
    @Input() public maxValue = 1;
    @Input() public size = "";
}

@Component({
    selector: "sd-progress-item",
    template: `
        <div>{{ label || "&nbsp;" }}</div>`,
    host: {
        "[class._theme-primary]": "theme === 'primary'",
        "[class._theme-success]": "theme === 'success'",
        "[class._theme-info]": "theme === 'info'",
        "[class._theme-warning]": "theme === 'warning'",
        "[class._theme-danger]": "theme === 'danger'",
        "[style.width]": "width"
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdProgressItemControl {
    @Input() public value = 0;
    @Input() public theme = "primary";

    public constructor(@Inject(forwardRef(() => SdProgressControl)) private _parent: SdProgressControl) {
    }

    public get label(): string {
        return this._parent ? this._parent.label : "";
    }

    public get maxValue(): number {
        return this._parent ? this._parent.maxValue : 1;
    }

    public get width(): string {
        return `${Math.min(this.value / this.maxValue, 1) * 100}%`;
    }
}