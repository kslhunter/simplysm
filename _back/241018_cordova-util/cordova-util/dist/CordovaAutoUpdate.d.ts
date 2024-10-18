import { SdServiceClient } from "@simplysm/sd-service-client";
export declare abstract class CordovaAutoUpdate {
    static runAsync(opt: {
        log: (messageHtml: string) => void;
        serviceClient?: SdServiceClient;
    }): Promise<void>;
}
