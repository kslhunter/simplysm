import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdTabviewItem = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-tabview-item {
    display: none;
    width: 100%;
    height: 100%;
    
    &[sd-selected=true] {
      display: block;
    }
  }`;
