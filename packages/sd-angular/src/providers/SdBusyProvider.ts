import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class SdBusyProvider {
  type?: "bar" | "spinner";
  noFade?: boolean;
}
