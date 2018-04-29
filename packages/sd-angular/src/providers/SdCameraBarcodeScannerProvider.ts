import {Injectable} from "@angular/core";
import {Exception, Safe} from "../../../sd-core/src";
import {SdBusyProvider} from "./SdBusyProvider";

@Injectable()
export class SdCameraBarcodeScannerProvider {
    private _platform: string = Safe.obj(window["cordova"]).platformId;
    private _plugin: any = Safe.obj(Safe.obj(window["cordova"])["plugins"])["barcodeScanner"];

    public constructor(private _busy: SdBusyProvider) {
    }

    public async scan(): Promise<string | undefined> {
        if (this._platform !== "android" && this._platform !== "browser") {
            throw new Exception(`잘못된 플랫폼: ${process.env.PLATFORM}`);
        }

        if (this._plugin === undefined) {
            throw new Exception("플러그인을 찾을 수 없습니다: phonegap-plugin-barcodescanner");
        }

        await this._busy.show();
        return await new Promise<string | undefined>((resolve, reject) => {
            this._plugin.scan((result: any) => {
                this._busy.hide();
                if (result.cancelled) {
                    resolve();
                }
                else {
                    resolve(result.text);
                }
            }, () => {
                this._busy.hide();
                resolve();
            }, {
                prompt: "스캔선에 맞추어 바코드를 놓으세요"
            });
        });
    }
}