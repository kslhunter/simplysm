import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdTabviewItem = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-tabview-item {
    display: none;
  
    &[sd-selected=true] {
      display: block;
    }
  }`;