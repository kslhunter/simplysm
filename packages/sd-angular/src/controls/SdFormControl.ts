import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    EventEmitter,
    Injector,
    Input,
    Output
} from "@angular/core";
import {Exception} from "../../../sd-core/src";
import {SdToastProvider} from "../providers/SdToastProvider";

@Component({
    selector: "sd-form",
    template: `
        <iframe id="remember"
                name="remember"
                src="about:blank"
                hidden></iframe>

        <form target="remember"
              method="post"
              action="about:blank"
              (submit)="onSubmit($event)">
            <ng-content></ng-content>
            <button type="submit"
                    hidden></button>
        </form>`,
    host: {
        "[class._inline]": "inline",
        "[class._table]": "table"
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdFormControl implements AfterViewInit {
    @Output() public readonly submit = new EventEmitter<any>();
    @Input() public inline = false;
    @Input() public table = false;

    public constructor(private _elementRef: ElementRef,
                       private _toast: SdToastProvider) {
    }

    public ngAfterViewInit(): void {
        const $this = $(this._elementRef.nativeElement);
        if (
            ($this.attr("class") || "").includes("sd-padding-") ||
            ($this.attr("style") || "").includes("padding")
        ) {
            throw new Exception("'sd-form' 컨트롤에는 'padding' 옵션을 줄 수 없습니다.");
        }
    }

    public requestSubmit(param?: any): void {
        const $this = $(this._elementRef.nativeElement);

        const $invalids = $this.find("form").find("*:invalid, *._error");
        if ($invalids.length > 0) {
            const $formItems = $invalids.parents("sd-form-item");
            if ($formItems.length > 0) {
                const labels = $formItems.toArray().map((item) => $(item).children("label").text().trim()).reverse().join(", ");
                this._toast.danger(`입력정보가 잘못되었습니다:\n  - ${labels}`);
            }
            else {
                this._toast.danger("입력정보가 잘못되었습니다.");
            }

            $invalids.eq(0).trigger("focus");
        }
        else {
            this.submit.emit(param);
        }
    }

    public onSubmit(e: Event): void {
        e.preventDefault();
        e.stopPropagation();
    }
}

@Component({
    selector: "sd-form-item",
    template: `
        <label *ngIf="isTableRow || label">{{ label }}</label>
        <div>
            <ng-content></ng-content>
        </div>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdFormItemControl {
    @Input()
    public set label(value: string) {
        if (value !== undefined && !(typeof value === "string")) {
            throw new Exception(`'sd-form.label'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }

        this._label = value;
    }

    public get label(): string {
        return this._label;
    }

    private _label = "";

    public get isTableRow(): boolean {
        //tslint:disable-next-line:no-null-keyword
        const formControl = this._injector.get(SdFormControl, null);
        if (!formControl) return false;

        return formControl.table;
    }

    public constructor(private _injector: Injector) {
    }
}