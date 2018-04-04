import {Logger, Wait} from "@simplism/core";
import {Routes} from "@angular/router";
import {Type} from "@angular/core";

export class SimgularHelpers {
    private static _isDetectElementChangeEnable = true;

    static getChromeVersion(): number | undefined {
        const raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
        return raw ? parseInt(raw[2], 10) : undefined;
    }

    static detectElementChange(element: Element, callback: () => void, options?: {
        resize?: boolean;
        childList?: boolean;
    }): void {
        const logger = Logger.getLogger("SimgularHelpers");

        options = {
            resize: true,
            childList: true,
            ...options
        };

        let nowWait = false;
        const runCallback = async () => {
            if (nowWait) return;

            nowWait = true;
            await Wait.true(() => this._isDetectElementChangeEnable);
            nowWait = false;

            callback();
        };

        let elementTagName = element.tagName.toLowerCase().startsWith("sd-") ? element.tagName.toLowerCase() : undefined;
        elementTagName = elementTagName ? elementTagName : $(element).parents().toArray().firstOr({tagName: ""}, item => item.tagName.toLowerCase().startsWith("sd-")).tagName.toLowerCase();
        elementTagName = elementTagName || element.tagName.toLowerCase();

        if (options.childList) {
            new MutationObserver(() => {
                logger.log("detect: mutate: " + elementTagName);
                runCallback();
            }).observe(element, {
                childList: true,
                characterData: true,
                subtree: true
            });
        }

        if (options.resize) {
            const chromeVersion = SimgularHelpers.getChromeVersion();
            if (chromeVersion! < 64) {
                logger.warn("64버전 이하의 크롬 브라우저에서는 컨트롤의 위치가 깨질 수 있습니다. [현재버전:" + chromeVersion + "]");
                $(window).on("resize", () => {
                    logger.log("detect: resize: " + elementTagName);
                    runCallback();
                });
            }
            else {
                new window["ResizeObserver"](() => {
                    logger.log("detect: resize: " + elementTagName);
                    runCallback();
                }).observe(element);
            }
        }
    }

    static stopDetectElementChanges(): void {
        this._isDetectElementChangeEnable = false;
    }

    static rerunDetectElementChanges(): void {
        this._isDetectElementChangeEnable = true;
    }


    static getRouteDeclarations(routes: Routes): Type<any>[] {
        let result: Type<any>[] = [];
        for (const route of routes) {
            if (route.component) {
                result.push(route.component);
            }

            if (route.children) {
                result = result.concat(this.getRouteDeclarations(route.children));
            }
        }
        return result;
    }
}