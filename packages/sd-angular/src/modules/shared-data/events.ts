import { SdServiceEventBase } from "@simplysm/sd-service-client";

export class SdSharedDataChangeEvent extends SdServiceEventBase<string, (string | number)[] | undefined> {
}
