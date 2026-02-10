import { ServiceEventListener } from "@simplysm/service-common";

export class SharedDataChangeEvent extends ServiceEventListener<
  { name: string; filter: unknown },
  (string | number)[] | undefined
> {
  readonly eventName = "SharedDataChangeEvent";
}
