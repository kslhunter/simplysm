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
import {SizeStrings} from "..";
import {SdFocusProvider} from "../providers/SdFocusProvider";

@Component({
    selector: "sd-combobox",
    template: `
        <sd-textfield #textField
                      type="text"
                      [size]="size"
                      [value]="text"
                      (valueChange)="textChange.emit($event)"
                      [required]="required"
                      [disabled]="disabled"
                      [placeholder]="placeholder"></sd-textfield>
        <div class="_icon">
            <sd-icon [icon]="'angle-down'" [fixedWidth]="true"></sd-icon>
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
    @ViewChild("dropdown", {read: ElementRef}) public dropdownElementRef?: ElementRef;
    @ViewChild("textField", {read: ElementRef}) public textFieldElementRef?: ElementRef;

    @Input() public text: any;
    @Output() public readonly textChange = new EventEmitter<any>();
    @Input() public size?: SizeStrings;
    @Input() public required = false;
    @Input() public disabled = false;
    @Input() public placeholder = "";
    @Output() public readonly blur = new EventEmitter<FocusEvent>();

    public isDropdownOpen = false;

    public constructor(private _zone: NgZone,
                private _focus: SdFocusProvider,
                private _cdr: ChangeDetectorRef) {
    }

    public ngAfterViewInit(): void {
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
