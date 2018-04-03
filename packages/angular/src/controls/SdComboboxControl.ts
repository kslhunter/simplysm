import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    NgZone,
    Output,
    ViewChild
} from "@angular/core";
import {SdFocusProvider} from "../providers/SdFocusProvider";

@Component({
    selector: "sd-combobox",
    template: `
        <sd-text-field #textField
                       [type]="'text'"
                       [value]="text"
                       (valueChange)="textChange.emit($event)"
                       [size]="size"
                       [required]="required"
                       [disabled]="disabled"
                       [placeholder]="placeholder"></sd-text-field>
        <div class="_icon">
            <i class="fas fa-fw fa-angle-down"></i>
        </div>
        <sd-dropdown #dropdown
                     [open]="isDropdownOpen">
            <ng-content></ng-content>
        </sd-dropdown>`,
    host: {
        "[class._size-sm]": "size === 'sm'"
    },
    changeDetection: ChangeDetectionStrategy.OnPush

})
export class SdComboboxControl implements AfterViewInit {
    @ViewChild("dropdown", {read: ElementRef}) dropdownElementRef?: ElementRef;
    @ViewChild("textField", {read: ElementRef}) textFieldElementRef?: ElementRef;

    @Input() text: any;
    @Output() textChange = new EventEmitter<any>();
    @Input() size = "default";
    @Input() required = false;
    @Input() disabled = false;
    @Input() placeholder = "";
    @Output() blur = new EventEmitter<FocusEvent>();

    isDropdownOpen = false;

    constructor(private _zone: NgZone,
                private _focus: SdFocusProvider,
                private _cdr: ChangeDetectorRef) {
    }

    ngAfterViewInit(): void {
        const $textfield = $(this.textFieldElementRef!.nativeElement);
        const $dropdown = $(this.dropdownElementRef!.nativeElement);

        $textfield.get(0).addEventListener("focus", (e) => {
            this.isDropdownOpen = true;
            this._cdr.markForCheck();
        }, true);

        $textfield.get(0).addEventListener("blur", (e) => {
            if ($dropdown.has(e.relatedTarget as any).length < 1 && $textfield.has(e.relatedTarget as any).length < 1) {
                this.isDropdownOpen = false;
                this.blur.emit(e);
            }
        }, true);

        $dropdown.get(0).addEventListener("blur", (e) => {
            if ($dropdown.has(e.relatedTarget as any).length < 1 && $textfield.has(e.relatedTarget as any).length < 1) {
                this.isDropdownOpen = false;
                this.blur.emit(e);
            }
        }, true);

        this._zone.runOutsideAngular(() => {
            $textfield.on("keydown", (e) => {
                if (e.which === 40) { // DOWN
                    e.preventDefault();
                    e.stopPropagation();

                    const $firstFocusable = $(this._focus.getFocusableElementList($dropdown.get(0))[0]);
                    $firstFocusable.trigger("focus");
                }
            });

            $dropdown.on("keydown", (e) => {
                if (e.which === 38) { // UP
                    const $firstFocusable = $(this._focus.getFocusableElementList($dropdown.get(0))[0]);
                    if (document.activeElement === $firstFocusable.get(0)) {
                        e.preventDefault();
                        e.stopPropagation();
                        $textfield.find("input").trigger("focus");
                    }
                }
            });
        });
    }
}
