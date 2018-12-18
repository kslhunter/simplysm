import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdDockContainer = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-dock-container {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    overflow: auto;
  }`;