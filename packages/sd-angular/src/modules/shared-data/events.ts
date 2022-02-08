import { SdServiceEventBase } from "@simplysm/sd-service-common";

export class SdSharedDataChangeEvent extends SdServiceEventBase<string, (string | number)[] | undefined> {
}
