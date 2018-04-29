import {Injectable} from "@angular/core";

@Injectable()
export class SdToastProvider {
    private _$container: JQuery;

    //private _containerElement: HTMLDivElement;

    public constructor() {
        this._$container = $("<div class='_sd-toast-container'></div>");
        $("body").append(this._$container);
    }

    public show(message: string): void {
        this._show(undefined, message);
    }

    public primary(message: string): void {
        this._show("primary", message);
    }

    public info(message: string): void {
        this._show("info", message);
    }

    public success(message: string): void {
        this._show("success", message);
    }

    public warning(message: string): void {
        this._show("warning", message);
    }

    public danger(message: string): void {
        this._show("danger", message);
    }

    private _show(theme: string | undefined, message: string): void {
        const existsToastElement = this._$container.children().toArray()
            .single((item) => $(item).data("theme") === theme && $(item).data("message") === message);
        if (existsToastElement) {
            clearTimeout($(existsToastElement).data("timeoutId"));
            $(existsToastElement).remove();
        }

        const $toast = $("<div class='_sd-toast'></div>");
        if (theme) {
            $toast.addClass(`_theme-${theme}`);
        }
        $toast.html(`<div>${message.replace(/\n/g, "<br/>")}</div>`);
        $toast.data({theme, message});
        this._$container.prepend($toast);

        $toast.data("timeoutId", window.setTimeout(() => {
            $toast.data("timeoutId", window.setTimeout(() => {
                $toast.remove();
            }, 500));
            $toast.removeClass("_open");
        }, 5000));

        $toast.get(0).offsetWidth; // force a repaint
        $toast.addClass("_open");
    }
}