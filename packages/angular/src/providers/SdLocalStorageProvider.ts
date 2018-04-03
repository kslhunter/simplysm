import {Injectable} from "@angular/core";
import {JsonConvert} from "@simplism/core";

@Injectable()
export class SdLocalStorageProvider {
    prefix = "sd";

    set(key: string, value: any): void {
        localStorage.setItem(this.prefix + "." + key, JsonConvert.stringify(value) || "");
    }

    get(key: string): any {
        return JsonConvert.parse(localStorage.getItem(this.prefix + "." + key) || undefined);
    }

    remove(key: string): void {
        localStorage.removeItem(key);
    }
}