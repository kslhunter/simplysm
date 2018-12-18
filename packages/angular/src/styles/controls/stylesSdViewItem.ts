import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdViewItem = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-view-item {
    display: none;

    &[sd-selected=true] {
      display: block;
    }
  }`;