import {Injectable} from "@angular/core";
import {Exception, Safe} from "../../../sd-core/src";

@Injectable()
export class SdKeyboardPanelProvider {
    private _platform: string = Safe.obj(window["cordova"]).platformId;
    private _plugin: any = Safe.obj(window["Keyboard"]);

    public get isVisible(): boolean {
        if (this._platform === "browser") {
            return this._isVisible;
        }
        this._validate();

        return this._plugin.isVisible;
    }

    private _isVisible = false;

    public show(): void {
        if (this._platform === "browser") {
            this._isVisible = true;
            return;
        }
        this._validate();

        return this._plugin.show();
    }

    public hide(): void {
        if (this._platform === "browser") {
            this._isVisible = false;
            return;
        }
        this._validate();

        return this._plugin.hide();
    }

    private _validate(): void {
        if (this._platform !== "android") {
            throw new Exception(`잘못된 플랫폼: ${process.env.PLATFORM}`);
        }

        if (this._plugin === undefined) {
            throw new Exception("플러그인을 찾을 수 없습니다: cordova-plugin-ionic-keyboard");
        }
    }
}