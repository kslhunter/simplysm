import {Injectable} from "@angular/core";
import {JsonConvert} from "../../../sd-core/src";

@Injectable()
export class SdLocalStorageProvider {
    public prefix = "sd";

    public set(key: string, value: any): void {
        localStorage.setItem(`${this.prefix}.${key}`, JsonConvert.stringify(value) || "");
    }

    public get(key: string): any {
        return JsonConvert.parse(localStorage.getItem(`${this.prefix}.${key}`) || undefined);
    }

    public remove(key: string): void {
        localStorage.removeItem(key);
    }
}