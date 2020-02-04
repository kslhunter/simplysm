import {Injectable} from "@angular/core";

@Injectable()
export class SdBusyContainerProvider {
  public type?: "bar" | "spinner";
  public noFade?: boolean;
}
