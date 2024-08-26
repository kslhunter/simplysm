import {Injectable, signal} from "@angular/core";

@Injectable({providedIn: "root"})
export class SdBusyProvider {
  type = signal<"bar" | "spinner" | undefined>(undefined);
  noFade = signal<boolean | undefined>(undefined);
}
