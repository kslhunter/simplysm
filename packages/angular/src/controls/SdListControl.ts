import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    EventEmitter,
    forwardRef,
    Inject,
    Input,
    Output
} from "@angular/core";
import {Exception} from "@simplism/core";
import {SdFocusProvider} from "../providers/SdFocusProvider";

@Component({
    selector: "sd-list",
    template: "<ng-content></ng-content>",
    host: {
        "[class._size-sm]": "size === 'sm'",
        "[class._size-lg]": "size === 'lg'",
        "[class._clickable]": "clickable"
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdListControl {
    @Input()
    size?: "sm" | "lg";

    @Input()
    clickable = false;
}

@Component({
    selector: "sd-list-item",
    template: `
        <div [class]="styleClass">
            <div (click)="onTitleClick()"
                 [class]="titleStyleClass"
                 [attr.tabindex]="realClickable ? '1' : undefined"
                 (keydown.enter)="onTitleClick()"
                 (keydown)="onTitleKeydown($event)">
                <ng-content></ng-content>
                
                <div class="_icon">
                    <i class="fas fa-fw fa-angle-down"></i>
                </div>
            </div>
            <div class="_child">
                <ng-content select="sd-list"></ng-content>
            </div>
        </div>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdListItemControl {
    open = false;

    @Input() header = false;
    @Input() size?: "sm" | "lg";
    @Input() class: string | undefined;
    @Output("title.click") titleClick = new EventEmitter<void>();
    @Input() clickable: boolean | undefined;

    @Input()
    set selected(value: boolean) {
        if (typeof value !== "boolean") {
            throw new Exception(`'sd-list-item.selected'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
        }
        this._selected = value;
    }

    private _selected = false;

    get realClickable(): boolean {
        return this.clickable === undefined ? this._parent.clickable : this.clickable;
    }

    constructor(private _elementRef: ElementRef,
                @Inject(forwardRef(() => SdListControl))
                private _parent: SdListControl,
                private _focus: SdFocusProvider) {
    }

    onTitleClick(): void {
        this.open = !this.open;
        this.titleClick.emit();
    }

    get styleClass(): string {
        const childDiv: HTMLDivElement = this._elementRef.nativeElement.children[0].children[1];
        const hasChild = childDiv.children.length > 0 &&
            childDiv.children[0].children.length > 0 &&
            Array.from(childDiv.children[0].children)
                .map(item => item as HTMLElement)
                .some((item: HTMLElement) => item.tagName.toLowerCase() === "sd-list-item");

        return Array.from(this._elementRef.nativeElement.classList).concat([
            this.header ? "_header" : "",
            hasChild ? "_has-child" : "",
            this.open ? "_open" : "",
            this.size ? "_size-" + this.size : this._parent.size ? "_size-" + this._parent.size : "",
            this._selected ? "_selected" : ""
        ]).filter(item => item).join(" ");
    }

    get titleStyleClass(): string {
        return (this.class || "").split(" ")
            .filter(item => item.startsWith("sd-padding"))
            .concat(["_title"]).join(" ");
    }

    onTitleKeydown(event: KeyboardEvent): void {
        if (event.key === "ArrowUp") {
            const $parent = $(this._elementRef.nativeElement).parent("sd-list");
            if (this._focus.prev($parent)) {
                event.preventDefault();
                event.stopPropagation();
            }
        }
        else if (event.key === "ArrowDown") {
            const $parent = $(this._elementRef.nativeElement).parent("sd-list");
            if (this._focus.next($parent)) {
                event.preventDefault();
                event.stopPropagation();
            }
        }
    }
}